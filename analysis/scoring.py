"""
Scoring engine that combines all signals into a final opportunity score.
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
import pandas as pd

from config import SCORING_WEIGHTS, SECTOR_ETFS
from analysis.signals import (
    calculate_momentum_score,
    calculate_valuation_score,
    calculate_growth_score,
    calculate_innovation_score,
    calculate_macro_score,
    calculate_price_returns,
    calculate_relative_strength,
    calculate_employment_growth,
)


@dataclass
class SectorScore:
    """Container for a sector's complete scoring breakdown."""
    sector: str
    opportunity_score: float
    rank: int = 0

    # Component scores
    momentum_score: float = 0.0
    valuation_score: float = 0.0
    growth_score: float = 0.0
    innovation_score: float = 0.0
    macro_score: float = 0.0

    # Raw metrics (for display)
    price_return_3mo: Optional[float] = None
    price_return_6mo: Optional[float] = None
    price_return_12mo: Optional[float] = None
    relative_strength: Optional[float] = None
    forward_pe: Optional[float] = None
    employment_growth: Optional[float] = None
    rd_intensity: Optional[float] = None

    def to_dict(self) -> dict:
        """Convert to dictionary for display/serialization."""
        return {
            'sector': self.sector,
            'opportunity_score': self.opportunity_score,
            'rank': self.rank,
            'momentum_score': self.momentum_score,
            'valuation_score': self.valuation_score,
            'growth_score': self.growth_score,
            'innovation_score': self.innovation_score,
            'macro_score': self.macro_score,
            'price_return_3mo': self.price_return_3mo,
            'price_return_6mo': self.price_return_6mo,
            'price_return_12mo': self.price_return_12mo,
            'relative_strength': self.relative_strength,
            'forward_pe': self.forward_pe,
            'employment_growth': self.employment_growth,
            'rd_intensity': self.rd_intensity,
        }


class SectorScorer:
    """
    Main scoring engine that calculates opportunity scores for all sectors.
    """

    def __init__(self, weights: Optional[Dict[str, float]] = None):
        """
        Initialize scorer with optional custom weights.

        Args:
            weights: Dictionary of signal category -> weight (must sum to 1.0)
        """
        self.weights = weights or SCORING_WEIGHTS

        # Validate weights sum to 1.0
        weight_sum = sum(self.weights.values())
        if abs(weight_sum - 1.0) > 0.01:
            raise ValueError(f"Weights must sum to 1.0, got {weight_sum}")

    def calculate_scores(self, data: dict) -> List[SectorScore]:
        """
        Calculate opportunity scores for all sectors.

        Args:
            data: Dictionary containing all fetched data:
                - sector_prices: Dict[str, DataFrame]
                - sector_info: Dict[str, dict]
                - macro_data: Dict[str, Series]
                - sector_pe: Dict[str, float]
                - employment_data: Dict[str, Series]
                - rd_data: Dict[str, float]

        Returns:
            List of SectorScore objects, sorted by opportunity score (descending)
        """
        # Use 'or {}' to handle explicit None values from data sources
        sector_prices = data.get('sector_prices') or {}
        sector_info = data.get('sector_info') or {}
        macro_data = data.get('macro_data') or {}
        sector_pe = data.get('sector_pe') or {}
        employment_data = data.get('employment_data') or {}
        rd_data = data.get('rd_data') or {}

        # Calculate component scores
        momentum_scores = calculate_momentum_score(sector_prices)
        valuation_scores = calculate_valuation_score(sector_pe, sector_info)
        growth_scores = calculate_growth_score(employment_data)
        innovation_scores = calculate_innovation_score(rd_data)
        macro_scores = calculate_macro_score(sector_prices, macro_data)

        # Calculate raw metrics for display
        price_returns = calculate_price_returns(sector_prices)
        rel_strength = calculate_relative_strength(sector_prices)
        employment_growth = calculate_employment_growth(employment_data)

        # Build sector scores
        sector_scores = []

        for sector in SECTOR_ETFS.keys():
            # Get component scores
            momentum = momentum_scores.get(sector, 50.0)
            valuation = valuation_scores.get(sector, 50.0)
            growth = growth_scores.get(sector, 50.0)
            innovation = innovation_scores.get(sector, 50.0)
            macro = macro_scores.get(sector, 50.0)

            # Calculate weighted opportunity score
            opportunity = (
                self.weights['momentum'] * momentum +
                self.weights['valuation'] * valuation +
                self.weights['growth'] * growth +
                self.weights['innovation'] * innovation +
                self.weights['macro'] * macro
            )

            # Get raw metrics (use 'or {}' to handle explicit None values)
            sector_returns = price_returns.get(sector) or {}
            info = sector_info.get(sector) or {}

            score = SectorScore(
                sector=sector,
                opportunity_score=round(opportunity, 2),
                momentum_score=momentum,
                valuation_score=valuation,
                growth_score=growth,
                innovation_score=innovation,
                macro_score=macro,
                price_return_3mo=sector_returns.get('3mo'),
                price_return_6mo=sector_returns.get('6mo'),
                price_return_12mo=sector_returns.get('12mo'),
                relative_strength=rel_strength.get(sector),
                forward_pe=sector_pe.get(sector) or info.get('forward_pe'),
                employment_growth=employment_growth.get(sector),
                rd_intensity=rd_data.get(sector),
            )

            sector_scores.append(score)

        # Sort by opportunity score and assign ranks
        sector_scores.sort(key=lambda x: x.opportunity_score, reverse=True)
        for i, score in enumerate(sector_scores):
            score.rank = i + 1

        return sector_scores

    def get_summary_report(self, scores: List[SectorScore]) -> dict:
        """
        Generate a summary report from sector scores.

        Args:
            scores: List of SectorScore objects

        Returns:
            Summary dictionary with rankings and insights
        """
        if not scores:
            return {'error': 'No scores available'}

        top_3 = scores[:3]
        bottom_3 = scores[-3:]

        # Calculate score distribution
        all_scores = [s.opportunity_score for s in scores]
        avg_score = sum(all_scores) / len(all_scores)
        max_score = max(all_scores)
        min_score = min(all_scores)

        # Identify strongest signals
        top_sector = scores[0]
        strengths = []
        if top_sector.momentum_score >= 70:
            strengths.append('strong momentum')
        if top_sector.valuation_score >= 70:
            strengths.append('attractive valuation')
        if top_sector.growth_score >= 70:
            strengths.append('employment growth')
        if top_sector.innovation_score >= 70:
            strengths.append('high R&D investment')
        if top_sector.macro_score >= 70:
            strengths.append('favorable macro positioning')

        return {
            'timestamp': pd.Timestamp.now().isoformat(),
            'top_sectors': [
                {'rank': s.rank, 'sector': s.sector, 'score': s.opportunity_score}
                for s in top_3
            ],
            'bottom_sectors': [
                {'rank': s.rank, 'sector': s.sector, 'score': s.opportunity_score}
                for s in bottom_3
            ],
            'score_distribution': {
                'average': round(avg_score, 2),
                'max': round(max_score, 2),
                'min': round(min_score, 2),
                'spread': round(max_score - min_score, 2),
            },
            'top_sector_drivers': strengths,
            'weights_used': self.weights,
        }

    def to_dataframe(self, scores: List[SectorScore]) -> pd.DataFrame:
        """
        Convert scores to a pandas DataFrame.

        Args:
            scores: List of SectorScore objects

        Returns:
            DataFrame with all sector scores
        """
        return pd.DataFrame([s.to_dict() for s in scores])


def run_analysis(data: dict, weights: Optional[Dict[str, float]] = None) -> Tuple[List[SectorScore], dict]:
    """
    Convenience function to run full analysis.

    Args:
        data: Fetched data dictionary
        weights: Optional custom weights

    Returns:
        Tuple of (sector_scores, summary_report)
    """
    scorer = SectorScorer(weights)
    scores = scorer.calculate_scores(data)
    summary = scorer.get_summary_report(scores)

    return scores, summary
