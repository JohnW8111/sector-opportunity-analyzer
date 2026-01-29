# Scoring Indicators - Detailed Explanation

This document explains the five scoring indicators used in the Sector Opportunity Analyzer.

---

## 1. MOMENTUM (Default Weight: 25%)

**What it measures:** How strongly a sector's price is trending upward relative to its history and the broader market.

### Three Components Combined

| Component | Weight | Calculation | Data Source |
|-----------|--------|-------------|-------------|
| **12-Month Returns** | 50% | `(today's price - price 252 days ago) / price 252 days ago × 100` | yfinance (sector ETFs) |
| **Relative Strength** | 35% | Sector's 12-month return minus S&P 500's 12-month return | yfinance (XLK, XLF, etc. vs SPY) |
| **Volume Trend** | 15% | `(20-day avg volume - 50-day avg volume) / 50-day avg volume × 100` | yfinance |

### Interpretation

- **High score (70+):** Sector is outperforming the market with strong price gains and increasing trading interest
- **Low score (<30):** Sector is lagging, underperforming the S&P 500, possibly with declining volume
- **Relative strength** matters because a sector up 15% means little if the S&P 500 is up 20%

### Example

If Technology is up 25% (12mo), SPY is up 18%, and Tech's recent volume is 10% above its 50-day average → strong momentum score

---

## 2. VALUATION (Default Weight: 20%)

**What it measures:** How "cheap" or "expensive" a sector is relative to other sectors, using forward P/E ratios.

### Calculation

```
Forward P/E = Current Price / Expected Earnings Per Share (next 12 months)
```

### Scoring Logic

`lower P/E = higher score` (value investing perspective)

| P/E Relative Position | Score Interpretation |
|-----------------------|---------------------|
| Lowest P/E among sectors | Highest valuation score (~80-100) |
| Median P/E | Middle score (~50) |
| Highest P/E among sectors | Lowest valuation score (~0-20) |

**Data Source:** yfinance (forward P/E from sector ETF info)

### Interpretation

- **High score:** Sector is trading at lower multiples — potentially undervalued or out of favor
- **Low score:** Sector is trading at premium multiples — market expects high growth (or it's overvalued)

### Caveat

Low P/E isn't always "good" — it could signal the market expects declining earnings (value trap). High P/E isn't always "bad" — growth sectors often deserve premium multiples.

---

## 3. GROWTH (Default Weight: 20%)

**What it measures:** Employment growth trends by sector — a proxy for economic expansion in that sector.

### Calculation

```
YoY Employment Growth = (Current Employment - Employment 12 months ago) / Employment 12 months ago × 100
```

**Data Source:** Bureau of Labor Statistics (BLS) Current Employment Statistics

### Sector-to-BLS Mapping

| Sector | BLS Series |
|--------|------------|
| Information Technology | CES6000000001 (Information sector) |
| Financials | CES5500000001 (Financial activities) |
| Energy | CES1021000001 (Mining and logging) |
| Health Care | CES6562000001 (Health care) |
| Consumer Discretionary | CES4200000001 (Retail trade) |
| Consumer Staples | CES3100000001 (Manufacturing - nondurable) |
| Industrials | CES3000000001 (Manufacturing) |
| Materials | CES1021200001 (Mining except oil/gas) |
| Utilities | CES4422000001 (Utilities) |
| Real Estate | CES5553000001 (Real estate) |
| Communication Services | CES5000000001 (Information/telecom) |

### Interpretation

- **High score:** Sector is adding jobs faster than peers — indicates business expansion, hiring, investment
- **Low score:** Sector is shedding jobs or growing slowly — potential contraction or automation

### Why Employment?

Job growth is a lagging-but-reliable indicator of sector health. Companies hire when they have real demand and cash flow.

---

## 4. INNOVATION (Default Weight: 20%)

**What it measures:** R&D intensity — how much a sector invests in research and development relative to revenue.

### Calculation

```
R&D Intensity = R&D Spending / Total Revenue (as percentage)
```

**Data Source:** Damodaran Online (NYU Stern) — Professor Aswath Damodaran's industry datasets

### How It Works

1. Fetches R&D data for ~90 industries from Damodaran's Excel file
2. Maps each industry to one of 11 GICS sectors (e.g., "Software" → Information Technology)
3. Averages R&D intensity across all industries in each sector

### Typical R&D Intensity by Sector

| Sector | Typical R&D/Revenue |
|--------|---------------------|
| Information Technology | 10-20% |
| Health Care (Pharma/Biotech) | 15-25% |
| Industrials | 2-5% |
| Financials | <1% |
| Utilities | <1% |

### Interpretation

- **High score:** Sector invests heavily in future products/services — potential for innovation-driven growth
- **Low score:** Sector spends little on R&D — mature, commoditized, or service-based

### Caveat

High R&D doesn't guarantee success — it's an input, not an output. But over long horizons (2-year target), R&D correlates with competitive advantage.

---

## 5. MACRO SENSITIVITY (Default Weight: 15%)

**What it measures:** How a sector's returns correlate with interest rate changes — specifically the 10-Year Treasury yield.

### Calculation

```
1. Get monthly sector returns and monthly 10Y Treasury rate changes
2. Calculate Pearson correlation between them over ~5 years
3. Lower correlation = higher score (more resilient)
```

**Data Source:** FRED (Federal Reserve Economic Data) — series DGS10

### Correlation Interpretation

| Correlation | Meaning | Examples |
|-------------|---------|----------|
| **Positive (+0.3 to +0.7)** | Sector rises when rates rise | Financials (banks profit from higher rates) |
| **Near Zero (-0.1 to +0.1)** | Sector is rate-agnostic | Consumer Staples, Health Care |
| **Negative (-0.3 to -0.7)** | Sector falls when rates rise | Utilities, Real Estate (rate-sensitive) |

### Current Scoring Logic

Lower correlation with rates = higher score

### Why?

The current implementation assumes you want **resilience** — sectors that won't crash if rates move unexpectedly. This is a conservative approach.

### Potential Enhancement

Could be flipped based on rate outlook:
- If you expect rates to rise → favor positive correlation (Financials)
- If you expect rates to fall → favor negative correlation (Utilities, REITs)

---

## How Scores Combine

```
Opportunity Score = (Momentum × 0.25) + (Valuation × 0.20) + (Growth × 0.20)
                  + (Innovation × 0.20) + (Macro × 0.15)
```

### Normalization Method

Z-score normalization (robust to outliers):
- Mean performance = 50
- One standard deviation above = ~65
- One standard deviation below = ~35
- Scores clamped to 0-100

---

## Data Sources Summary

| Indicator | Primary Source | API Key Required |
|-----------|----------------|------------------|
| Momentum | yfinance (Yahoo Finance) | No |
| Valuation | yfinance (Yahoo Finance) | No |
| Growth | BLS (Bureau of Labor Statistics) | Optional |
| Innovation | Damodaran (NYU Stern) | No |
| Macro | FRED (Federal Reserve) | Yes (free) |

---

## Adjusting Weights

Weights can be adjusted via:
1. **UI Sidebar:** Real-time sliders in the React dashboard
2. **API Parameters:** `?momentum=0.4&valuation=0.2&growth=0.2&innovation=0.1&macro=0.1`
3. **Config File:** Default weights in `config.py` → `SCORING_WEIGHTS`

Weights are automatically normalized to sum to 1.0.
