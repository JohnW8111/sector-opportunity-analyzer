# Sector Opportunity Analyzer

A tool for analyzing economic sectors and identifying investment opportunities over a 2-year horizon. Built with **FastAPI** backend and **React** frontend (Mantine UI + Recharts).

## Features

- **Multi-signal analysis** across 11 GICS sectors:
  - Momentum (price performance, relative strength, volume trends)
  - Valuation (forward P/E vs historical)
  - Growth (employment trends)
  - Innovation (R&D intensity)
  - Macro sensitivity (interest rate correlation)

- **Modern React dashboard** with:
  - Top 3 sector opportunity cards
  - Interactive bar chart rankings (Chart/Table toggle)
  - Radar chart for sector comparison
  - Score heatmap across all components
  - Real-time weight adjustment sliders
  - Data source status indicators

- **REST API** with endpoints for:
  - Sector scores with custom weights
  - Summary reports
  - Individual sector details
  - Cache management

- **Smart caching** - 12-hour data cache to minimize API calls

## Data Sources

| Signal | Source | API Key Required |
|--------|--------|------------------|
| Sector prices & returns | yfinance (Yahoo Finance) | No |
| Sector P/E ratios | yfinance (Yahoo Finance) | No |
| Macro data (rates, inflation) | FRED | Yes (free) |
| Employment by sector | BLS | Optional |
| R&D intensity | Damodaran (NYU) | No |

## Installation

1. Clone the repository:
```bash
git clone https://github.com/JohnW8111/sector-opportunity-analyzer.git
cd sector-opportunity-analyzer
```

2. Create a virtual environment and install Python dependencies:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r backend/requirements.txt
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

4. Set up API keys:
```bash
cp .env.example .env
# Edit .env with your API keys
```

### Getting API Keys

- **FRED**: https://fred.stlouisfed.org/docs/api/api_key.html (free)
- **BLS**: https://data.bls.gov/registrationEngine/ (optional, improves rate limits)

## Usage

### Development Mode

**Terminal 1 - Start the backend:**
```bash
source venv/bin/activate
uvicorn backend.main:app --reload --port 8000
```

**Terminal 2 - Start the frontend:**
```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

### API Documentation

With the backend running, visit http://localhost:8000/docs for interactive Swagger documentation.

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scores` | GET | All sector scores (accepts weight params) |
| `/api/scores/summary` | GET | Summary with top/bottom sectors |
| `/api/scores/{sector}` | GET | Single sector details |
| `/api/data/sectors` | GET | List of sectors |
| `/api/data/quality` | GET | Data source status |
| `/api/cache/info` | GET | Cache statistics |
| `/api/cache/clear` | POST | Clear cache |

### Custom Weights

Pass weight parameters to adjust scoring:
```bash
curl "http://localhost:8000/api/scores?momentum=0.4&valuation=0.2&growth=0.2&innovation=0.1&macro=0.1"
```

## Project Structure

```
sector-opportunity-analyzer/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── requirements.txt        # Backend dependencies
│   └── api/
│       ├── schemas.py          # Pydantic models
│       └── routes/
│           ├── scores.py       # Scoring endpoints
│           ├── sectors.py      # Data/quality endpoints
│           └── cache.py        # Cache management
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx             # Main application
│       ├── api/client.ts       # API client
│       ├── hooks/              # React hooks
│       ├── types/              # TypeScript types
│       └── components/
│           ├── Layout/         # Header, Sidebar
│           ├── Rankings/       # Cards, BarChart, Table
│           ├── ScoreBreakdown/ # RadarChart, Heatmap
│           ├── SectorDetails/  # Drill-down view
│           └── DataQuality/    # Source status
│
├── config.py                   # Configuration and settings
├── data/
│   ├── cache/                  # Cached API responses
│   ├── cache_manager.py        # 12-hour caching logic
│   └── fetchers.py             # API connectors
│
├── analysis/
│   ├── signals.py              # Signal calculations
│   └── scoring.py              # Scoring engine
│
├── app.py                      # Legacy Streamlit app
└── .replit                     # Replit deployment config
```

## Tech Stack

**Backend:**
- FastAPI
- Pydantic v2
- Uvicorn

**Frontend:**
- React 18
- TypeScript
- Vite
- Mantine v7 (UI components)
- Recharts (charts)
- TanStack Query (data fetching)
- Axios

## Scoring Methodology

The opportunity score (0-100) is calculated as a weighted average of five component scores:

| Component | Default Weight | Description |
|-----------|----------------|-------------|
| Momentum | 25% | Price performance, relative strength vs S&P 500 |
| Valuation | 20% | Forward P/E attractiveness (lower = better) |
| Growth | 20% | Employment growth trends |
| Innovation | 20% | R&D intensity (R&D as % of revenue) |
| Macro | 15% | Interest rate sensitivity |

Weights are adjustable via the sidebar sliders or API parameters.

## Deployment (Replit)

The project includes a `.replit` configuration for easy deployment:

```bash
# Runs both backend and frontend
./run.sh
```

## Future Enhancements

- [ ] Patent filing data (USPTO/PatentsView)
- [ ] Backtesting module
- [ ] Historical score comparison
- [ ] Export to PDF/Excel
- [ ] Email alerts for significant changes

## Disclaimer

This tool is for informational and educational purposes only. It does not constitute investment advice. Always conduct your own research before making investment decisions.

## License

MIT License
