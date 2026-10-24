# Sector Opportunity Analyzer

A Next.js web application that calculates opportunity scores for the 11 GICS sectors using five signal dimensions: momentum, valuation, growth, innovation, and macro sensitivity.

This is a TypeScript rewrite of the [Go-based sector analyzer](https://github.com/JohnW8111/sector-opportunity-analyzer-go), deployed as a Node web service on Render.

## Signals

| Signal | Weight | Data Source | Method |
|--------|--------|-------------|--------|
| **Momentum** | 25% | Yahoo Finance | 12-month returns (50%), relative strength vs SPY (35%), volume trend (15%) |
| **Valuation** | 20% | Yahoo Finance | Forward P/E — lower P/E = higher score |
| **Growth** | 20% | BLS, with FRED fallback | Year-over-year employment change by sector |
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
| **FRED** | 10Y Treasury, 2Y Treasury, Fed Funds, CPI, GDP; identical BLS employment series when BLS is unavailable | API key (free) |
| **BLS** | Sector employment by NAICS classification | API key (optional, higher rate limits) |
| **Damodaran** | R&D intensity by industry | Hardcoded averages |

Employment requests time out after 10 seconds. If BLS fails or omits a sector's history, the app requests the same seasonally adjusted CES series from FRED using the existing FRED key. FRED aliases are mapped to their original BLS source codes in `lib/config.ts`; the existing industry proxies and scoring weights are unchanged. For example, [USPBS](https://fred.stlouisfed.org/series/USPBS) identifies its source as `CES6000000001`.

The dashboard identifies the employment data provider and warns if any sector has fewer than 13 observations or data more than three calendar months old. `/api/data/quality` includes each sector's provider, series ID, observation count, and latest observation date. If both sources fail, affected growth scores fall back to 50 with a visible warning.

Run the employment fallback regression tests with `npm test`.

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

- Node.js 24 (selected by `.node-version`)
- FRED API key (free at https://fred.stlouisfed.org/docs/api/api_key.html)
- BLS API key (optional, from https://www.bls.gov/developers/)

### Local Development

```bash
# Install dependencies
npm install

# Create .env.local with your FRED_API_KEY (see below).
# Add BLS_API_KEY if you have a registered BLS key.

# Run dev server
npm run dev
```

### Environment Variables

Create a `.env.local` file:

```
FRED_API_KEY=your_fred_api_key_here
BLS_API_KEY=your_bls_api_key_here   # optional
```

## Deploy to Render

1. Create a **Node web service** from this GitHub repository in Render, using `main`.
2. Select the **Free** compute plan and Oregon region.
3. Build command: `npm ci --include=dev && npm run build`.
4. Start command: `npm start`. The server binds to `0.0.0.0` and uses Render's `PORT` environment variable (normally `10000`).
5. Set `FRED_API_KEY` and, if available, `BLS_API_KEY` in the service's private environment variables **before building**. Never commit their values.
6. Set the HTTP health-check path to `/api/health` in **Settings > Health Checks**.
7. Enable automatic deployment on commits to `main`.

For a local production check, run `npm run build` followed by `PORT=10000 npm start`. The health endpoint checks the application server without contacting external data providers. Google Fonts and upstream data requests require network access during the build.

No database, persistent disk, or stored history needs migration. Caches are per instance and reset after a restart, sleep, or redeploy. A free service sleeps when idle and wakes on the next request.

### Domain cutover

Verify the assigned `onrender.com` address first: check the dashboard, `/api/health`, `/api/scores`, and `/api/data/quality`. The quality endpoint can return HTTP 200 while an upstream data source is failing, so inspect each source's status and compare it with the existing deployment.

Use the assigned `onrender.com` URL as the production address. This deployment uses the free Render address because the workspace's two included custom domains are already in use. An existing address such as `sector.johnw8111.us` can redirect visitors to the Render URL through Cloudflare without adding a third custom domain to Render. Verify the redirect and target dashboard before retiring Vercel. Leave unrelated DNS and Vercel projects unchanged.

References: [Render web services](https://render.com/docs/web-services), [Node versions](https://render.com/docs/node-version), [health checks](https://render.com/docs/health-checks), and [Cloudflare DNS](https://render.com/docs/configure-cloudflare-dns).

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
