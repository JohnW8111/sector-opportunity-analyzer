"""Pydantic models for API responses."""
from typing import Optional, Dict, List
from pydantic import BaseModel, Field


class SectorScoreResponse(BaseModel):
    """Individual sector score with all components."""
    sector: str
    opportunity_score: float = Field(..., ge=0, le=100)
    rank: int = Field(..., ge=1, le=11)

    # Component scores (0-100)
    momentum_score: float = 0.0
    valuation_score: float = 0.0
    growth_score: float = 0.0
    innovation_score: float = 0.0
    macro_score: float = 0.0

    # Raw metrics
    price_return_3mo: Optional[float] = None
    price_return_6mo: Optional[float] = None
    price_return_12mo: Optional[float] = None
    relative_strength: Optional[float] = None
    forward_pe: Optional[float] = None
    employment_growth: Optional[float] = None
    rd_intensity: Optional[float] = None


class ScoresResponse(BaseModel):
    """Response for all sector scores."""
    scores: List[SectorScoreResponse]
    weights_used: Dict[str, float]
    timestamp: str


class SummaryResponse(BaseModel):
    """Summary report with top/bottom sectors."""
    top_sectors: List[Dict]
    bottom_sectors: List[Dict]
    score_distribution: Dict[str, float]
    top_sector_drivers: List[str]
    weights_used: Dict[str, float]
    timestamp: str


class WeightsRequest(BaseModel):
    """Request body for custom weights."""
    momentum: float = Field(0.25, ge=0, le=1)
    valuation: float = Field(0.20, ge=0, le=1)
    growth: float = Field(0.20, ge=0, le=1)
    innovation: float = Field(0.20, ge=0, le=1)
    macro: float = Field(0.15, ge=0, le=1)


class DataSourceStatus(BaseModel):
    """Status of a data source."""
    name: str
    status: str  # 'ok', 'error', 'warning'
    message: Optional[str] = None


class DataQualityResponse(BaseModel):
    """Data quality status for all sources."""
    sources: List[DataSourceStatus]
    overall_status: str


class SectorListResponse(BaseModel):
    """List of available sectors."""
    sectors: List[str]


class CacheInfoResponse(BaseModel):
    """Cache statistics."""
    total_files: int
    valid_files: int
    expired_files: int
    total_size_mb: float


class CacheClearResponse(BaseModel):
    """Result of cache clear operation."""
    files_removed: int
    message: str
