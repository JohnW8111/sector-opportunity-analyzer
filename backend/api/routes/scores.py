"""Scoring endpoints."""
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Query, HTTPException

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from analysis.scoring import SectorScorer, run_analysis
from data.fetchers import fetch_all_data
from backend.api.schemas import (
    SectorScoreResponse,
    ScoresResponse,
    SummaryResponse,
)

router = APIRouter(prefix="/api/scores", tags=["scores"])

# Cache data in memory (will be refreshed on demand)
_cached_data = None


def get_data():
    """Get or fetch data."""
    global _cached_data
    if _cached_data is None:
        _cached_data = fetch_all_data()
    return _cached_data


def refresh_data():
    """Force refresh data."""
    global _cached_data
    _cached_data = fetch_all_data()
    return _cached_data


@router.get("", response_model=ScoresResponse)
async def get_scores(
    momentum: Optional[float] = Query(None, ge=0, le=1),
    valuation: Optional[float] = Query(None, ge=0, le=1),
    growth: Optional[float] = Query(None, ge=0, le=1),
    innovation: Optional[float] = Query(None, ge=0, le=1),
    macro: Optional[float] = Query(None, ge=0, le=1),
    refresh: bool = Query(False, description="Force refresh data"),
):
    """Get all sector scores with optional custom weights."""
    try:
        data = refresh_data() if refresh else get_data()

        # Build weights dict if any provided
        weights = None
        if any([momentum, valuation, growth, innovation, macro]):
            weights = {
                'momentum': momentum or 0.25,
                'valuation': valuation or 0.20,
                'growth': growth or 0.20,
                'innovation': innovation or 0.20,
                'macro': macro or 0.15,
            }
            # Normalize weights to sum to 1.0
            total = sum(weights.values())
            if total > 0:
                weights = {k: v / total for k, v in weights.items()}

        scorer = SectorScorer(weights=weights)
        scores = scorer.calculate_scores(data)

        return ScoresResponse(
            scores=[
                SectorScoreResponse(
                    sector=s.sector,
                    opportunity_score=s.opportunity_score,
                    rank=s.rank,
                    momentum_score=s.momentum_score,
                    valuation_score=s.valuation_score,
                    growth_score=s.growth_score,
                    innovation_score=s.innovation_score,
                    macro_score=s.macro_score,
                    price_return_3mo=s.price_return_3mo,
                    price_return_6mo=s.price_return_6mo,
                    price_return_12mo=s.price_return_12mo,
                    relative_strength=s.relative_strength,
                    forward_pe=s.forward_pe,
                    employment_growth=s.employment_growth,
                    rd_intensity=s.rd_intensity,
                )
                for s in scores
            ],
            weights_used=scorer.weights,
            timestamp=datetime.now().isoformat(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary", response_model=SummaryResponse)
async def get_summary(
    momentum: Optional[float] = Query(None, ge=0, le=1),
    valuation: Optional[float] = Query(None, ge=0, le=1),
    growth: Optional[float] = Query(None, ge=0, le=1),
    innovation: Optional[float] = Query(None, ge=0, le=1),
    macro: Optional[float] = Query(None, ge=0, le=1),
):
    """Get summary report with top/bottom sectors."""
    try:
        data = get_data()

        weights = None
        if any([momentum, valuation, growth, innovation, macro]):
            weights = {
                'momentum': momentum or 0.25,
                'valuation': valuation or 0.20,
                'growth': growth or 0.20,
                'innovation': innovation or 0.20,
                'macro': macro or 0.15,
            }
            total = sum(weights.values())
            if total > 0:
                weights = {k: v / total for k, v in weights.items()}

        scores, summary = run_analysis(data, weights)

        return SummaryResponse(**summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{sector}", response_model=SectorScoreResponse)
async def get_sector_score(sector: str):
    """Get score for a specific sector."""
    try:
        data = get_data()
        scorer = SectorScorer()
        scores = scorer.calculate_scores(data)

        # Find the sector
        for s in scores:
            if s.sector.lower() == sector.lower():
                return SectorScoreResponse(
                    sector=s.sector,
                    opportunity_score=s.opportunity_score,
                    rank=s.rank,
                    momentum_score=s.momentum_score,
                    valuation_score=s.valuation_score,
                    growth_score=s.growth_score,
                    innovation_score=s.innovation_score,
                    macro_score=s.macro_score,
                    price_return_3mo=s.price_return_3mo,
                    price_return_6mo=s.price_return_6mo,
                    price_return_12mo=s.price_return_12mo,
                    relative_strength=s.relative_strength,
                    forward_pe=s.forward_pe,
                    employment_growth=s.employment_growth,
                    rd_intensity=s.rd_intensity,
                )

        raise HTTPException(status_code=404, detail=f"Sector '{sector}' not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
