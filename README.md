# Sector Opportunity Analyzer

A Next.js web application that calculates opportunity scores for the 11 GICS sectors using five signal dimensions: momentum, valuation, growth, innovation, and macro sensitivity.

This is a TypeScript rewrite of the [Go-based sector analyzer](https://github.com/JohnW8111/sector-opportunity-analyzer-go), rebuilt for deployment on Vercel.

## Signals

| Signal | Weight | Data Source | Method |
|--------|--------|-------------|--------|
| **Momentum** | 25% | Yahoo Finance | 12-month returns (50%), relative strength vs SPY (35%), volume trend (15%) |
| **Valuation** | 20% | Yahoo Finance | Forward P/E — lower P/E = higher score |
| **Growth** | 20% | BLS | Year-over-year employment change by sector |
| **Innovation** | 20% | Damodaran (hardcoded) | R&D intensity as % of revenue |
| **Macro** | 15% | FRED + Yahoo Finance | Correlation of sector returns with 10Y Treasury yield changes — lower correlation = more resilient |

Scores are normalized to 0–100 using z-score normalization and combined with configurable weights. Weights can be adjusted interactively via the dashboard sliders.

## Dashboard Features

- **Score Weight Sliders** — adjust signal weights in real time (auto-normalized to 100%)
- **Top Opportunities** — top 3 sectors with rank badges and component breakdowns
- **Sector Rankings** — horizontal bar chart with Chart/Table toggle
- **Distribution Stats** — average, spread, and range across all sectors
- **Component Radar** — multi-sector radar chart for comparing signal profiles
- **Score Heatmap** — color-coded matrix of all sectors and signals

## Data Sources

| Source | What | Auth |
|--------|------|------|
| **Yahoo Finance** | 5yr daily prices, P/E ratios (cookie/crumb auth) | None required |
| **FRED** | 10Y Treasury, 2Y Treasury, Fed Funds, CPI, GDP | API key (free) |
| **BLS** | Sector employment by NAICS classification | API key (optional, higher rate limits) |
| **Damodaran** | R&D intensity by industry | Hardcoded averages |

## Sector ETF Mappings

| GICS Sector | ETF |
|-------------|-----|
| Information Technology | XLK |
| Financials | XLF |
| Energy | XLE |
| Health Care | XLV |
| Consumer Discretionary | XLY |
| Consumer Staples | XLP |
| Industrials | XLI |
| Materials | XLB |
| Utilities | XLU |
| Real Estate | XLRE |
| Communication Services | XLC |

Benchmark: SPY (S&P 500)

## Getting Started

### Prerequisites

- Node.js 20+
- FRED API key (free at https://fred.stlouisfed.org/docs/api/api_key.html)
- BLS API key (optional, from https://www.bls.gov/developers/)

### Local Development

```bash
# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
# Edit .env.local and add your FRED_API_KEY

# Run dev server
npm run dev
```

### Environment Variables

Create a `.env.local` file:

```
FRED_API_KEY=your_fred_api_key_here
BLS_API_KEY=your_bls_api_key_here   # optional
```

## Deploy to Vercel

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add environment variables: `FRED_API_KEY` and optionally `BLS_API_KEY`
4. Deploy

The dashboard page uses ISR with a 12-hour revalidation window. Data is cached in-memory for 10 minutes to avoid redundant API calls across routes.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/scores` | All sector scores (supports custom weight query params) |
| GET | `/api/scores/summary` | Top 3, bottom 3, distribution stats, drivers |
| GET | `/api/scores/{sector}` | Single sector detail (case-insensitive) |
| GET | `/api/data/sectors` | List of all 11 GICS sector names |
| GET | `/api/data/quality` | Data source validation (pass/fail per source) |
| GET | `/api/health` | Health check with version |

## Project Structure

```
lib/
  config.ts              — Sector mappings, weights, BLS/FRED series IDs
  types.ts               — TypeScript domain models
  fetch-all-data.ts      — Parallel data orchestrator with TTL cache
  data-sources/
    yahoo.ts             — Yahoo Finance price + P/E fetcher
    fred.ts              — FRED macro time series
    bls.ts               — BLS employment data
    rd-data.ts           — Hardcoded R&D intensity values
  analysis/
    signals.ts           — 5 signal calculations + normalization
    scoring.ts           — Weighted composite scoring engine
app/
  page.tsx               — Server component (data fetch + ISR)
  components/
    Dashboard.tsx         — Client component (sliders, charts, heatmap)
  api/                   — 6 API route handlers
```

## Tech Stack

- **Next.js 16** with App Router
- **TypeScript**
- **Recharts** for bar chart, radar chart
- **simple-statistics** for correlation and z-score calculations
- **Tailwind CSS**
