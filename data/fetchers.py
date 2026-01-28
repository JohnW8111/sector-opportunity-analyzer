"""
Data fetchers for various sources: yfinance, FRED, FMP, BLS, Damodaran.
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
    FMP_API_KEY_ENV, FRED_API_KEY_ENV, BLS_API_KEY_ENV,
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
# FINANCIAL MODELING PREP FETCHERS (Sector P/E data)
# =============================================================================

def fetch_sector_pe_fmp() -> Optional[Dict[str, float]]:
    """
    Fetch sector P/E ratios from Financial Modeling Prep.
    Tries v3 endpoints first, then falls back to v4 if needed.

    Returns:
        Dictionary mapping sector names to P/E ratios
    """
    import requests

    api_key = os.environ.get(FMP_API_KEY_ENV)
    if not api_key:
        print(f"Warning: {FMP_API_KEY_ENV} not set. FMP data unavailable.")
        return None

    cache_params = {'type': 'sector_pe_v3'}
    cached = get_cached_data('fmp', cache_params)
    if cached is not None:
        return cached

    # Map FMP sector names to our GICS names
    fmp_to_gics = {
        'Technology': 'Information Technology',
        'Financial Services': 'Financials',
        'Energy': 'Energy',
        'Healthcare': 'Health Care',
        'Consumer Cyclical': 'Consumer Discretionary',
        'Consumer Defensive': 'Consumer Staples',
        'Industrials': 'Industrials',
        'Basic Materials': 'Materials',
        'Utilities': 'Utilities',
        'Real Estate': 'Real Estate',
        'Communication Services': 'Communication Services',
    }

    sector_pe = {}

    # Try v3 sector-performance endpoint first (more likely to be free)
    try:
        url = "https://financialmodelingprep.com/api/v3/sectors-performance"
        params = {'apikey': api_key}
        response = requests.get(url, params=params)
        response.raise_for_status()

        data = response.json()
        print(f"FMP v3 sectors-performance returned: {len(data)} sectors")

        # Note: This endpoint returns performance, not P/E
        # We'll use it to confirm API access works, but need different endpoint for P/E

    except Exception as e:
        print(f"FMP v3 sectors-performance failed: {e}")

    # Try v4 sector P/E endpoint
    try:
        url = "https://financialmodelingprep.com/api/v4/sector_price_earning_ratio"
        params = {'date': datetime.now().strftime('%Y-%m-%d'), 'exchange': 'NYSE', 'apikey': api_key}
        response = requests.get(url, params=params)
        response.raise_for_status()

        data = response.json()

        for item in data:
            fmp_sector = item.get('sector')
            gics_sector = fmp_to_gics.get(fmp_sector, fmp_sector)
            if gics_sector in SECTOR_ETFS:
                sector_pe[gics_sector] = item.get('pe')

        if sector_pe:
            save_to_cache('fmp', cache_params, sector_pe)
            return sector_pe

    except Exception as e:
        print(f"Error fetching FMP v4 sector P/E: {e}")

    # If we got here, return None (no P/E data available from FMP)
    print("FMP sector P/E not available - will use yfinance fallback")
    return None


def fetch_sector_performance_fmp() -> Optional[Dict[str, dict]]:
    """
    Fetch sector performance data from FMP v3 endpoint.

    Returns:
        Dictionary mapping sector names to performance data
    """
    import requests

    api_key = os.environ.get(FMP_API_KEY_ENV)
    if not api_key:
        return None

    cache_params = {'type': 'sector_performance_v3'}
    cached = get_cached_data('fmp', cache_params)
    if cached is not None:
        return cached

    fmp_to_gics = {
        'Technology': 'Information Technology',
        'Financial Services': 'Financials',
        'Energy': 'Energy',
        'Healthcare': 'Health Care',
        'Consumer Cyclical': 'Consumer Discretionary',
        'Consumer Defensive': 'Consumer Staples',
        'Industrials': 'Industrials',
        'Basic Materials': 'Materials',
        'Utilities': 'Utilities',
        'Real Estate': 'Real Estate',
        'Communication Services': 'Communication Services',
    }

    try:
        url = "https://financialmodelingprep.com/api/v3/sectors-performance"
        params = {'apikey': api_key}
        response = requests.get(url, params=params)
        response.raise_for_status()

        data = response.json()
        sector_perf = {}

        for item in data:
            fmp_sector = item.get('sector')
            gics_sector = fmp_to_gics.get(fmp_sector, fmp_sector)
            if gics_sector in SECTOR_ETFS:
                # Parse the percentage string (e.g., "2.5%" -> 2.5)
                change_str = item.get('changesPercentage', '0%')
                try:
                    change = float(change_str.replace('%', ''))
                except:
                    change = 0.0
                sector_perf[gics_sector] = {
                    'changesPercentage': change,
                }

        if sector_perf:
            save_to_cache('fmp', cache_params, sector_perf)
            print(f"FMP v3 sector performance: Retrieved {len(sector_perf)} sectors")
            return sector_perf

    except Exception as e:
        print(f"Error fetching FMP v3 sector performance: {e}")

    return None


def fetch_historical_sector_pe_fmp(years_back: int = 5) -> Optional[Dict[str, List[dict]]]:
    """
    Fetch historical sector P/E ratios from FMP.

    Args:
        years_back: Number of years of historical data

    Returns:
        Dictionary mapping sector names to lists of historical P/E data
    """
    import requests

    api_key = os.environ.get(FMP_API_KEY_ENV)
    if not api_key:
        return None

    cache_params = {'type': 'historical_sector_pe', 'years': years_back}
    cached = get_cached_data('fmp', cache_params)
    if cached is not None:
        return cached

    try:
        url = f"https://financialmodelingprep.com/api/v4/sector_price_earning_ratio"
        params = {'apikey': api_key}

        # FMP may require different endpoint for historical - adjust as needed
        # This is a simplified version; actual implementation may vary
        response = requests.get(url, params=params)
        response.raise_for_status()

        data = response.json()
        save_to_cache('fmp', cache_params, data)
        return data

    except Exception as e:
        print(f"Error fetching historical FMP P/E: {e}")
        return None


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

    print("Fetching sector P/E from FMP...")
    sector_pe = fetch_sector_pe_fmp()

    print("Fetching employment data from BLS...")
    employment_data = fetch_bls_employment()

    print("Fetching R&D data from Damodaran...")
    rd_data = fetch_damodaran_rd()

    return {
        'sector_prices': sector_prices,
        'sector_info': sector_info,
        'macro_data': macro_data,
        'sector_pe': sector_pe,
        'employment_data': employment_data,
        'rd_data': rd_data,
    }
