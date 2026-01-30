"""
Signal calculations for sector opportunity analysis.
Each function calculates a specific signal and returns normalized scores (0-100).
"""

import pandas as pd
import numpy as np
from typing import Dict, Optional, Tuple
from scipy import stats

from config import SECTOR_ETFS, MOMENTUM_PERIODS


def normalize_score(values: Dict[str, float], higher_is_better: bool = True) -> Dict[str, float]:
    """
    Normalize values to 0-100 scale using min-max normalization.

    Args:
        values: Dictionary of sector -> value
        higher_is_better: If True, higher values get higher scores

    Returns:
        Dictionary of sector -> normalized score (0-100)
    """
    if not values:
        return {}

    vals = list(values.values())
    min_val = min(vals)
    max_val = max(vals)

    if max_val == min_val:
        return {k: 50.0 for k in values}

    normalized = {}
    for sector, val in values.items():
        score = ((val - min_val) / (max_val - min_val)) * 100
        if not higher_is_better:
            score = 100 - score
        normalized[sector] = round(score, 2)

    return normalized


def normalize_score_zscore(values: Dict[str, float], higher_is_better: bool = True) -> Dict[str, float]:
    """
    Normalize values using z-score, then convert to 0-100 scale.
    More robust to outliers than min-max.

    Args:
        values: Dictionary of sector -> value
        higher_is_better: If True, higher values get higher scores

    Returns:
        Dictionary of sector -> normalized score (0-100)
    """
    if not values:
        return {}

    vals = np.array(list(values.values()))
    mean = np.mean(vals)
    std = np.std(vals)

    if std == 0:
        return {k: 50.0 for k in values}

    normalized = {}
    for sector, val in values.items():
        z = (val - mean) / std
        # Convert z-score to percentile (roughly 0-100)
        # Using a sigmoid-like transformation
        score = 50 + (z * 15)  # Spread z-scores across 0-100
        score = max(0, min(100, score))  # Clamp to 0-100
        if not higher_is_better:
            score = 100 - score
        normalized[sector] = round(score, 2)

    return normalized


# =============================================================================
# MOMENTUM SIGNALS
# =============================================================================

def calculate_price_returns(sector_prices: Dict[str, pd.DataFrame]) -> Dict[str, Dict[str, float]]:
    """
    Calculate price returns for multiple periods.

    Args:
        sector_prices: Dictionary of sector -> price DataFrame

    Returns:
        Dictionary of sector -> {period: return_pct}
    """
    returns = {}

    for sector, df in sector_prices.items():
        if sector == '_benchmark':
            continue

        if df is None or df.empty:
            continue

        close = df['Close'] if 'Close' in df.columns else df.get('close')
        if close is None or len(close) < 20:
            continue

        sector_returns = {}
        for months in MOMENTUM_PERIODS:
            trading_days = months * 21  # Approximate trading days per month
            if len(close) >= trading_days:
                start_price = close.iloc[-trading_days]
                end_price = close.iloc[-1]
                ret = ((end_price - start_price) / start_price) * 100
                sector_returns[f'{months}mo'] = ret

        if sector_returns:
            returns[sector] = sector_returns

    return returns


def calculate_relative_strength(
    sector_prices: Dict[str, pd.DataFrame],
    period_months: int = 12
) -> Dict[str, float]:
    """
    Calculate relative strength vs benchmark (S&P 500).

    Args:
        sector_prices: Dictionary of sector -> price DataFrame
        period_months: Lookback period in months

    Returns:
        Dictionary of sector -> relative strength score
    """
    benchmark_df = sector_prices.get('_benchmark')
    if benchmark_df is None or benchmark_df.empty:
        return {}

    benchmark_close = benchmark_df['Close'] if 'Close' in benchmark_df.columns else benchmark_df.get('close')
    trading_days = period_months * 21

    if len(benchmark_close) < trading_days:
        return {}

    benchmark_return = (benchmark_close.iloc[-1] / benchmark_close.iloc[-trading_days] - 1) * 100

    relative_strength = {}
    for sector, df in sector_prices.items():
        if sector == '_benchmark' or df is None or df.empty:
            continue

        close = df['Close'] if 'Close' in df.columns else df.get('close')
        if len(close) < trading_days:
            continue

        sector_return = (close.iloc[-1] / close.iloc[-trading_days] - 1) * 100
        relative_strength[sector] = sector_return - benchmark_return

    return relative_strength


def calculate_volume_trend(
    sector_prices: Dict[str, pd.DataFrame],
    short_period: int = 20,
    long_period: int = 50
) -> Dict[str, float]:
    """
    Calculate volume trend (short-term avg vs long-term avg).
    Positive values indicate increasing interest.

    Args:
        sector_prices: Dictionary of sector -> price DataFrame
        short_period: Short-term moving average period (days)
        long_period: Long-term moving average period (days)

    Returns:
        Dictionary of sector -> volume trend score
    """
    volume_trends = {}

    for sector, df in sector_prices.items():
        if sector == '_benchmark' or df is None or df.empty:
            continue

        volume = df['Volume'] if 'Volume' in df.columns else df.get('volume')
        if volume is None or len(volume) < long_period:
            continue

        short_avg = volume.iloc[-short_period:].mean()
        long_avg = volume.iloc[-long_period:].mean()

        if long_avg > 0:
            trend = ((short_avg - long_avg) / long_avg) * 100
            volume_trends[sector] = trend

    return volume_trends


def calculate_momentum_score(sector_prices: Dict[str, pd.DataFrame]) -> Dict[str, float]:
    """
    Calculate combined momentum score from price returns, relative strength, and volume.

    Returns:
        Dictionary of sector -> momentum score (0-100)
    """
    # Get component signals
    returns = calculate_price_returns(sector_prices)
    rel_strength = calculate_relative_strength(sector_prices)
    volume_trend = calculate_volume_trend(sector_prices)

    # Normalize each component
    returns_12mo = {s: r.get('12mo', 0) for s, r in returns.items()}
    norm_returns = normalize_score_zscore(returns_12mo, higher_is_better=True)
    norm_rel_strength = normalize_score_zscore(rel_strength, higher_is_better=True)
    norm_volume = normalize_score_zscore(volume_trend, higher_is_better=True)

    # Combine with weights
    momentum_scores = {}
    for sector in SECTOR_ETFS.keys():
        ret_score = norm_returns.get(sector, 50)
        rs_score = norm_rel_strength.get(sector, 50)
        vol_score = norm_volume.get(sector, 50)

        # Weights: 50% returns, 35% relative strength, 15% volume
        combined = (0.50 * ret_score) + (0.35 * rs_score) + (0.15 * vol_score)
        momentum_scores[sector] = round(combined, 2)

    return momentum_scores


# =============================================================================
# VALUATION SIGNALS
# =============================================================================

def calculate_valuation_score(
    sector_pe: Optional[Dict[str, float]],
    sector_info: Optional[Dict[str, dict]] = None
) -> Dict[str, float]:
    """
    Calculate valuation score based on P/E ratios.
    Lower P/E relative to market = higher score (value opportunity).

    Args:
        sector_pe: Dictionary of sector -> forward P/E ratio
        sector_info: Additional sector info from yfinance

    Returns:
        Dictionary of sector -> valuation score (0-100)
    """
    if not sector_pe:
        # Fallback to yfinance data
        if sector_info:
            sector_pe = {s: info.get('forward_pe') for s, info in sector_info.items()
                        if info.get('forward_pe') is not None}
        else:
            return {s: 50.0 for s in SECTOR_ETFS.keys()}

    # Filter out None and invalid values
    valid_pe = {s: pe for s, pe in sector_pe.items() if pe and pe > 0}

    if not valid_pe:
        return {s: 50.0 for s in SECTOR_ETFS.keys()}

    # Lower P/E = better value = higher score
    valuation_scores = normalize_score_zscore(valid_pe, higher_is_better=False)

    # Fill in missing sectors with neutral score
    for sector in SECTOR_ETFS.keys():
        if sector not in valuation_scores:
            valuation_scores[sector] = 50.0

    return valuation_scores


# =============================================================================
# GROWTH SIGNALS (Employment)
# =============================================================================

def calculate_employment_growth(employment_data: Dict[str, pd.Series]) -> Dict[str, float]:
    """
    Calculate year-over-year employment growth by sector.

    Args:
        employment_data: Dictionary of sector -> employment time series

    Returns:
        Dictionary of sector -> employment growth rate (%)
    """
    growth_rates = {}

    for sector, series in employment_data.items():
        if series is None or len(series) < 13:
            continue

        # Calculate YoY growth (current vs 12 months ago)
        current = series.iloc[-1]
        year_ago = series.iloc[-13] if len(series) >= 13 else series.iloc[0]

        if year_ago > 0:
            growth = ((current - year_ago) / year_ago) * 100
            growth_rates[sector] = growth

    return growth_rates


def calculate_growth_score(employment_data: Dict[str, pd.Series]) -> Dict[str, float]:
    """
    Calculate growth score based on employment trends.

    Returns:
        Dictionary of sector -> growth score (0-100)
    """
    employment_growth = calculate_employment_growth(employment_data)

    if not employment_growth:
        return {s: 50.0 for s in SECTOR_ETFS.keys()}

    growth_scores = normalize_score_zscore(employment_growth, higher_is_better=True)

    # Fill in missing sectors
    for sector in SECTOR_ETFS.keys():
        if sector not in growth_scores:
            growth_scores[sector] = 50.0

    return growth_scores


# =============================================================================
# INNOVATION SIGNALS (R&D)
# =============================================================================

def calculate_innovation_score(rd_data: Dict[str, float]) -> Dict[str, float]:
    """
    Calculate innovation score based on R&D intensity.
    Higher R&D intensity = more investment in future = higher score.

    Args:
        rd_data: Dictionary of sector -> R&D intensity (R&D/Revenue)

    Returns:
        Dictionary of sector -> innovation score (0-100)
    """
    if not rd_data:
        return {s: 50.0 for s in SECTOR_ETFS.keys()}

    # Filter out zeros (sectors with no R&D data)
    valid_rd = {s: rd for s, rd in rd_data.items() if rd > 0}

    if not valid_rd:
        return {s: 50.0 for s in SECTOR_ETFS.keys()}

    innovation_scores = normalize_score_zscore(valid_rd, higher_is_better=True)

    # Fill in missing sectors with below-average score
    for sector in SECTOR_ETFS.keys():
        if sector not in innovation_scores:
            innovation_scores[sector] = 30.0  # Below average for no R&D data

    return innovation_scores


# =============================================================================
# MACRO SENSITIVITY SIGNALS
# =============================================================================

def calculate_rate_sensitivity(
    sector_prices: Dict[str, pd.DataFrame],
    interest_rates: Optional[pd.Series]
) -> Dict[str, float]:
    """
    Calculate sector sensitivity to interest rate changes.
    Uses correlation between sector returns and rate changes.

    Lower/negative correlation with rates = better in rising rate environment
    (but we want sectors that benefit from current environment)

    Args:
        sector_prices: Dictionary of sector -> price DataFrame
        interest_rates: Time series of interest rates (e.g., 10Y Treasury)

    Returns:
        Dictionary of sector -> rate sensitivity (correlation)
    """
    if interest_rates is None or interest_rates.empty:
        return {}

    sensitivities = {}

    # Resample rates to monthly for correlation with returns
    rates_monthly = interest_rates.resample('ME').last()
    rate_changes = rates_monthly.pct_change().dropna()

    for sector, df in sector_prices.items():
        if sector == '_benchmark' or df is None or df.empty:
            continue

        close = df['Close'] if 'Close' in df.columns else df.get('close')
        if close is None:
            continue

        # Calculate monthly returns
        close_monthly = close.resample('ME').last()
        returns = close_monthly.pct_change().dropna()

        # Align dates
        common_dates = returns.index.intersection(rate_changes.index)
        if len(common_dates) < 12:
            continue

        aligned_returns = returns.loc[common_dates]
        aligned_rates = rate_changes.loc[common_dates]

        # Calculate correlation
        corr, _ = stats.pearsonr(aligned_returns, aligned_rates)
        sensitivities[sector] = corr

    return sensitivities


def calculate_macro_score(
    sector_prices: Dict[str, pd.DataFrame],
    macro_data: Dict[str, pd.Series]
) -> Dict[str, float]:
    """
    Calculate macro sensitivity score.
    Combines rate sensitivity with overall macro positioning.

    Returns:
        Dictionary of sector -> macro score (0-100)
    """
    interest_rates = macro_data.get('treasury_10y')
    rate_sensitivity = calculate_rate_sensitivity(sector_prices, interest_rates)

    if not rate_sensitivity:
        return {s: 50.0 for s in SECTOR_ETFS.keys()}

    # For macro score, we want sectors that are resilient
    # Lower correlation with rates = more resilient = higher score
    # (This is a simplification; could be refined based on rate outlook)
    macro_scores = normalize_score_zscore(rate_sensitivity, higher_is_better=False)

    # Fill in missing sectors
    for sector in SECTOR_ETFS.keys():
        if sector not in macro_scores:
            macro_scores[sector] = 50.0

    return macro_scores
