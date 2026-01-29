"""
Data fetchers for various sources: yfinance, FRED, BLS, Damodaran.
All fetchers use the cache_manager for 12-hour caching.
"""

import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np

from data.cache_manager import get_cached_data, save_to_cache
from config import (
    SECTOR_ETFS, MARKET_BENCHMARK, FRED_SERIES,
    BLS_EMPLOYMENT_SERIES, DAMODARAN_RD_URL, DAMODARAN_TO_GICS,
    FRED_API_KEY_ENV, BLS_API_KEY_ENV,
    MOMENTUM_PERIODS, MACRO_SENSITIVITY_YEARS, PE_HISTORICAL_YEARS
)


# =============================================================================
# YFINANCE FETCHERS (Sector ETF data)
# =============================================================================

def fetch_sector_prices(period: str = "5y") -> Dict[str, pd.DataFrame]:
    """
    Fetch historical price data for all sector ETFs.

    Args:
        period: Data period (e.g., '1y', '2y', '5y')

    Returns:
        Dictionary mapping sector names to price DataFrames
    """
    import yfinance as yf

    cache_params = {'type': 'sector_prices', 'period': period}
    cached = get_cached_data('yfinance', cache_params)
    if cached is not None:
        return {k: pd.DataFrame(v) for k, v in cached.items()}

    sector_data = {}

    # Fetch all ETFs including benchmark
    all_tickers = list(SECTOR_ETFS.values()) + [MARKET_BENCHMARK]

    for sector, ticker in SECTOR_ETFS.items():
        try:
            etf = yf.Ticker(ticker)
            hist = etf.history(period=period)
            if not hist.empty:
                sector_data[sector] = hist
        except Exception as e:
            print(f"Error fetching {ticker} for {sector}: {e}")

    # Also fetch benchmark
    try:
        benchmark = yf.Ticker(MARKET_BENCHMARK)
        sector_data['_benchmark'] = benchmark.history(period=period)
    except Exception as e:
        print(f"Error fetching benchmark {MARKET_BENCHMARK}: {e}")

    # Cache the data (convert DataFrames to dicts for JSON serialization)
    # Convert Timestamps to ISO format strings for JSON compatibility
    cache_data = {}
    for k, v in sector_data.items():
        df_reset = v.reset_index()
        df_dict = df_reset.to_dict(orient='list')
        # Convert any Timestamp objects to strings
        for col, values in df_dict.items():
            df_dict[col] = [
                val.isoformat() if hasattr(val, 'isoformat') else val
                for val in values
            ]
        cache_data[k] = df_dict
    save_to_cache('yfinance', cache_params, cache_data)

    return sector_data


def fetch_sector_info() -> Dict[str, dict]:
    """
    Fetch current info (P/E, etc.) for all sector ETFs.

    Returns:
        Dictionary mapping sector names to info dicts
    """
    import yfinance as yf

    cache_params = {'type': 'sector_info'}
    cached = get_cached_data('yfinance', cache_params)
    if cached is not None:
        return cached

    sector_info = {}

    for sector, ticker in SECTOR_ETFS.items():
        try:
            etf = yf.Ticker(ticker)
            info = etf.info
            sector_info[sector] = {
                'forward_pe': info.get('forwardPE'),
                'trailing_pe': info.get('trailingPE'),
                'dividend_yield': info.get('dividendYield'),
                'avg_volume': info.get('averageVolume'),
                'market_cap': info.get('totalAssets'),
            }
        except Exception as e:
            print(f"Error fetching info for {ticker}: {e}")
            sector_info[sector] = {}

    save_to_cache('yfinance', cache_params, sector_info)
    return sector_info


# =============================================================================
# FRED FETCHERS (Macro data)
# =============================================================================

def fetch_fred_series(series_id: str, start_date: Optional[str] = None) -> Optional[pd.Series]:
    """
    Fetch a single FRED series.

    Args:
        series_id: FRED series identifier
        start_date: Start date in 'YYYY-MM-DD' format

    Returns:
        Pandas Series with the data
    """
    from fredapi import Fred

    api_key = os.environ.get(FRED_API_KEY_ENV)
    if not api_key:
        print(f"Warning: {FRED_API_KEY_ENV} not set. FRED data unavailable.")
        return None

    cache_params = {'series_id': series_id, 'start_date': start_date}
    cached = get_cached_data('fred', cache_params)
    if cached is not None:
        return pd.Series(cached['values'], index=pd.to_datetime(cached['index']))

    try:
        fred = Fred(api_key=api_key)
        data = fred.get_series(series_id, observation_start=start_date)

        # Cache the data
        cache_data = {
            'values': data.tolist(),
            'index': [d.isoformat() for d in data.index]
        }
        save_to_cache('fred', cache_params, cache_data)

        return data
    except Exception as e:
        print(f"Error fetching FRED series {series_id}: {e}")
        return None


def fetch_macro_data(years_back: int = 5) -> Dict[str, pd.Series]:
    """
    Fetch all macro data series from FRED.

    Args:
        years_back: Number of years of historical data

    Returns:
        Dictionary mapping series names to data Series
    """
    start_date = (datetime.now() - timedelta(days=years_back * 365)).strftime('%Y-%m-%d')

    macro_data = {}
    for name, series_id in FRED_SERIES.items():
        data = fetch_fred_series(series_id, start_date)
        if data is not None:
            macro_data[name] = data

    return macro_data


# =============================================================================
# BLS FETCHERS (Employment data)
# =============================================================================

def fetch_bls_employment(years_back: int = 5) -> Dict[str, pd.Series]:
    """
    Fetch employment data by sector from BLS.

    Args:
        years_back: Number of years of historical data

    Returns:
        Dictionary mapping sector names to employment Series
    """
    import requests

    cache_params = {'type': 'employment', 'years': years_back}
    cached = get_cached_data('bls', cache_params)
    if cached is not None:
        return {k: pd.Series(v['values'], index=pd.to_datetime(v['index']))
                for k, v in cached.items()}

    api_key = os.environ.get(BLS_API_KEY_ENV, '')
    end_year = datetime.now().year
    start_year = end_year - years_back

    # BLS API endpoint
    url = 'https://api.bls.gov/publicAPI/v2/timeseries/data/'

    series_ids = list(BLS_EMPLOYMENT_SERIES.values())

    payload = {
        'seriesid': series_ids,
        'startyear': str(start_year),
        'endyear': str(end_year),
    }

    if api_key:
        payload['registrationkey'] = api_key

    headers = {'Content-type': 'application/json'}

    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()

        if data.get('status') != 'REQUEST_SUCCEEDED':
            print(f"BLS API error: {data.get('message', 'Unknown error')}")
            return {}

        # Parse results
        employment_data = {}
        series_to_sector = {v: k for k, v in BLS_EMPLOYMENT_SERIES.items()}

        for series in data.get('Results', {}).get('series', []):
            series_id = series.get('seriesID')
            sector = series_to_sector.get(series_id)

            if sector:
                records = []
                for item in series.get('data', []):
                    year = int(item['year'])
                    month = int(item['period'][1:])  # 'M01' -> 1
                    value = float(item['value'])
                    date = datetime(year, month, 1)
                    records.append({'date': date, 'value': value})

                if records:
                    df = pd.DataFrame(records).sort_values('date')
                    employment_data[sector] = pd.Series(
                        df['value'].values,
                        index=pd.DatetimeIndex(df['date'])
                    )

        # Cache the data
        cache_data = {
            k: {'values': v.tolist(), 'index': [d.isoformat() for d in v.index]}
            for k, v in employment_data.items()
        }
        save_to_cache('bls', cache_params, cache_data)

        return employment_data

    except Exception as e:
        print(f"Error fetching BLS data: {e}")
        return {}


# =============================================================================
# DAMODARAN FETCHERS (R&D data)
# =============================================================================

def fetch_damodaran_rd() -> Dict[str, float]:
    """
    Fetch R&D intensity data from Damodaran's NYU dataset.

    Returns:
        Dictionary mapping GICS sector names to R&D intensity (R&D/Revenue)
    """
    cache_params = {'type': 'rd_intensity'}
    cached = get_cached_data('damodaran', cache_params)
    if cached is not None:
        return cached

    try:
        # Read the Excel file from Damodaran's website
        df = pd.read_excel(DAMODARAN_RD_URL, sheet_name=0, skiprows=7)

        # The structure may vary; adjust column names as needed
        # Typically: Industry Name, Number of Firms, R&D/Sales, etc.

        # Find relevant columns (names may vary by year)
        industry_col = None
        rd_sales_col = None

        for col in df.columns:
            col_lower = str(col).lower()
            if 'industry' in col_lower and industry_col is None:
                industry_col = col
            if 'r&d' in col_lower and 'sales' in col_lower:
                rd_sales_col = col

        if industry_col is None or rd_sales_col is None:
            # Try by position if column names don't match
            industry_col = df.columns[0]
            rd_sales_col = df.columns[2]  # Typically 3rd column

        # Build mapping from Damodaran industries to GICS sectors
        sector_rd = {sector: [] for sector in SECTOR_ETFS.keys()}

        for _, row in df.iterrows():
            industry = str(row[industry_col]).strip()
            rd_value = row[rd_sales_col]

            if pd.isna(rd_value) or not isinstance(rd_value, (int, float)):
                continue

            # Map to GICS sector
            gics_sector = DAMODARAN_TO_GICS.get(industry)
            if gics_sector and gics_sector in sector_rd:
                sector_rd[gics_sector].append(float(rd_value))

        # Average R&D intensity per GICS sector
        result = {}
        for sector, values in sector_rd.items():
            if values:
                result[sector] = np.mean(values)
            else:
                result[sector] = 0.0

        save_to_cache('damodaran', cache_params, result)
        return result

    except Exception as e:
        print(f"Error fetching Damodaran R&D data: {e}")
        # Return empty dict with all sectors
        return {sector: 0.0 for sector in SECTOR_ETFS.keys()}


# =============================================================================
# COMBINED DATA FETCHER
# =============================================================================

def fetch_all_data() -> dict:
    """
    Fetch all data needed for sector analysis.

    Returns:
        Dictionary containing all fetched data
    """
    print("Fetching sector price data...")
    sector_prices = fetch_sector_prices()

    print("Fetching sector info...")
    sector_info = fetch_sector_info()

    print("Fetching macro data from FRED...")
    macro_data = fetch_macro_data()

    print("Fetching employment data from BLS...")
    employment_data = fetch_bls_employment()

    print("Fetching R&D data from Damodaran...")
    rd_data = fetch_damodaran_rd()

    return {
        'sector_prices': sector_prices,
        'sector_info': sector_info,
        'macro_data': macro_data,
        'employment_data': employment_data,
        'rd_data': rd_data,
    }
