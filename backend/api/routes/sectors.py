"""Sector and data quality endpoints."""
import sys
import os
from pathlib import Path
from typing import List

from fastapi import APIRouter, HTTPException

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from config import SECTOR_ETFS, FMP_API_KEY_ENV, FRED_API_KEY_ENV, BLS_API_KEY_ENV
from backend.api.schemas import (
    DataSourceStatus,
    DataQualityResponse,
    SectorListResponse,
)

router = APIRouter(prefix="/api/data", tags=["data"])


@router.get("/sectors", response_model=SectorListResponse)
async def get_sectors():
    """Get list of available sectors."""
    return SectorListResponse(sectors=list(SECTOR_ETFS.keys()))


@router.get("/quality", response_model=DataQualityResponse)
async def get_data_quality():
    """Get data source quality/status information."""
    sources: List[DataSourceStatus] = []

    # Check yfinance (always available, no API key)
    sources.append(DataSourceStatus(
        name="Yahoo Finance",
        status="ok",
        message="Sector prices and basic info"
    ))

    # Check FRED API
    fred_key = os.environ.get(FRED_API_KEY_ENV)
    if fred_key:
        sources.append(DataSourceStatus(
            name="FRED",
            status="ok",
            message="Macro economic data"
        ))
    else:
        sources.append(DataSourceStatus(
            name="FRED",
            status="warning",
            message="API key not configured - macro scores may be limited"
        ))

    # Check FMP API
    fmp_key = os.environ.get(FMP_API_KEY_ENV)
    if fmp_key:
        sources.append(DataSourceStatus(
            name="Financial Modeling Prep",
            status="ok",
            message="Forward P/E ratios"
        ))
    else:
        sources.append(DataSourceStatus(
            name="Financial Modeling Prep",
            status="warning",
            message="API key not configured - valuation data limited"
        ))

    # Check BLS API (optional)
    bls_key = os.environ.get(BLS_API_KEY_ENV)
    sources.append(DataSourceStatus(
        name="Bureau of Labor Statistics",
        status="ok" if bls_key else "warning",
        message="Employment data" if bls_key else "API key not configured (optional)"
    ))

    # Check Damodaran (always available, scrapes web)
    sources.append(DataSourceStatus(
        name="Damodaran R&D Data",
        status="ok",
        message="R&D intensity metrics"
    ))

    # Determine overall status
    statuses = [s.status for s in sources]
    if all(s == "ok" for s in statuses):
        overall = "ok"
    elif any(s == "error" for s in statuses):
        overall = "error"
    else:
        overall = "warning"

    return DataQualityResponse(
        sources=sources,
        overall_status=overall
    )
