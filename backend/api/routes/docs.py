"""Documentation endpoints."""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/api/docs", tags=["docs"])


class IndicatorComponent(BaseModel):
    """A component of an indicator."""
    name: str
    weight: str
    calculation: str
    source: str


class IndicatorDoc(BaseModel):
    """Documentation for a scoring indicator."""
    id: str
    name: str
    default_weight: str
    summary: str
    description: str
    components: List[IndicatorComponent] = []
    interpretation_high: str
    interpretation_low: str
    data_source: str
    caveat: str = ""


class IndicatorsResponse(BaseModel):
    """All indicator documentation."""
    indicators: List[IndicatorDoc]


INDICATOR_DOCS = [
    IndicatorDoc(
        id="momentum",
        name="Momentum",
        default_weight="25%",
        summary="How strongly a sector's price is trending upward relative to its history and the broader market.",
        description="Combines price returns, relative strength vs S&P 500, and volume trends to identify sectors with strong upward price momentum.",
        components=[
            IndicatorComponent(
                name="12-Month Returns",
                weight="50%",
                calculation="(today's price - price 252 days ago) / price 252 days ago × 100",
                source="yfinance"
            ),
            IndicatorComponent(
                name="Relative Strength",
                weight="35%",
                calculation="Sector's 12-month return minus S&P 500's 12-month return",
                source="yfinance"
            ),
            IndicatorComponent(
                name="Volume Trend",
                weight="15%",
                calculation="(20-day avg volume - 50-day avg volume) / 50-day avg volume × 100",
                source="yfinance"
            ),
        ],
        interpretation_high="Sector is outperforming the market with strong price gains and increasing trading interest",
        interpretation_low="Sector is lagging, underperforming the S&P 500, possibly with declining volume",
        data_source="yfinance (Yahoo Finance) - No API key required",
        caveat="Momentum can reverse quickly. Past performance doesn't guarantee future results."
    ),
    IndicatorDoc(
        id="valuation",
        name="Valuation",
        default_weight="20%",
        summary="How 'cheap' or 'expensive' a sector is relative to other sectors, using forward P/E ratios.",
        description="Uses forward P/E ratios to identify sectors trading at attractive valuations. Lower P/E relative to peers results in higher scores (value investing perspective).",
        components=[
            IndicatorComponent(
                name="Forward P/E Ratio",
                weight="100%",
                calculation="Current Price / Expected Earnings Per Share (next 12 months)",
                source="yfinance"
            ),
        ],
        interpretation_high="Sector is trading at lower multiples — potentially undervalued or out of favor",
        interpretation_low="Sector is trading at premium multiples — market expects high growth (or it's overvalued)",
        data_source="yfinance (Yahoo Finance) - No API key required",
        caveat="Low P/E isn't always 'good' — it could signal expected declining earnings (value trap). High P/E isn't always 'bad' — growth sectors often deserve premium multiples."
    ),
    IndicatorDoc(
        id="growth",
        name="Growth",
        default_weight="20%",
        summary="Employment growth trends by sector — a proxy for economic expansion in that sector.",
        description="Measures year-over-year employment growth using Bureau of Labor Statistics data. Sectors adding jobs faster than peers score higher.",
        components=[
            IndicatorComponent(
                name="YoY Employment Growth",
                weight="100%",
                calculation="(Current Employment - Employment 12 months ago) / Employment 12 months ago × 100",
                source="BLS"
            ),
        ],
        interpretation_high="Sector is adding jobs faster than peers — indicates business expansion, hiring, investment",
        interpretation_low="Sector is shedding jobs or growing slowly — potential contraction or automation",
        data_source="Bureau of Labor Statistics (BLS) - API key optional (improves rate limits)",
        caveat="Employment is a lagging indicator. By the time hiring shows up in data, the trend may be mature."
    ),
    IndicatorDoc(
        id="innovation",
        name="Innovation",
        default_weight="20%",
        summary="R&D intensity — how much a sector invests in research and development relative to revenue.",
        description="Uses Damodaran's industry R&D data to identify sectors investing heavily in future products and services. Higher R&D intensity suggests potential for innovation-driven growth.",
        components=[
            IndicatorComponent(
                name="R&D Intensity",
                weight="100%",
                calculation="R&D Spending / Total Revenue (as percentage)",
                source="Damodaran (NYU)"
            ),
        ],
        interpretation_high="Sector invests heavily in future products/services — potential for innovation-driven growth",
        interpretation_low="Sector spends little on R&D — mature, commoditized, or service-based",
        data_source="Damodaran Online (NYU Stern) - No API key required",
        caveat="High R&D doesn't guarantee success — it's an input, not an output. Some sectors (Financials, Utilities) naturally have low R&D."
    ),
    IndicatorDoc(
        id="macro",
        name="Macro Sensitivity",
        default_weight="15%",
        summary="How a sector's returns correlate with interest rate changes — specifically the 10-Year Treasury yield.",
        description="Calculates correlation between sector returns and interest rate changes over 5 years. Sectors with lower correlation to rates score higher (more resilient to rate movements).",
        components=[
            IndicatorComponent(
                name="Rate Correlation",
                weight="100%",
                calculation="Pearson correlation between monthly sector returns and 10Y Treasury rate changes",
                source="FRED + yfinance"
            ),
        ],
        interpretation_high="Sector is resilient to interest rate changes — won't crash if rates move unexpectedly",
        interpretation_low="Sector is highly sensitive to rates — may suffer in volatile rate environments",
        data_source="FRED (Federal Reserve) - API key required (free)",
        caveat="Current scoring favors rate resilience. Could be adjusted based on rate outlook — if you expect rates to fall, rate-sensitive sectors (Utilities, REITs) may outperform."
    ),
]


@router.get("/indicators", response_model=IndicatorsResponse)
async def get_indicator_docs():
    """Get documentation for all scoring indicators."""
    return IndicatorsResponse(indicators=INDICATOR_DOCS)


@router.get("/indicators/{indicator_id}", response_model=IndicatorDoc)
async def get_indicator_doc(indicator_id: str):
    """Get documentation for a specific indicator."""
    for doc in INDICATOR_DOCS:
        if doc.id == indicator_id:
            return doc
    return None
