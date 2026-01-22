# Sector Opportunity Analyzer

A Python-based tool for analyzing economic sectors and identifying investment opportunities over a 2-year horizon. Built with Streamlit for interactive visualization.

## Features

- **Multi-signal analysis** across 11 GICS sectors:
  - Momentum (price performance, relative strength, volume trends)
  - Valuation (forward P/E vs historical)
  - Growth (employment trends)
  - Innovation (R&D intensity)
  - Macro sensitivity (interest rate correlation)

- **Interactive dashboard** with:
  - Sector rankings with opportunity scores
  - Component score breakdowns
  - Radar chart comparisons
  - Detailed sector drill-downs

- **Smart caching** - 12-hour data cache to minimize API calls

## Data Sources

| Signal | Source | API Key Required |
|--------|--------|------------------|
| Sector prices & returns | yfinance (Yahoo Finance) | No |
| Sector P/E ratios | Financial Modeling Prep | Yes (free tier) |
| Macro data (rates, inflation) | FRED | Yes (free) |
| Employment by sector | BLS | Optional |
| R&D intensity | Damodaran (NYU) | No |

## Installation

1. Clone the repository:
```bash
git clone https://github.com/JohnW8111/sector-opportunity-analyzer.git
cd sector-opportunity-analyzer
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up API keys:
```bash
cp .env.example .env
# Edit .env with your API keys
```

### Getting API Keys

- **FMP (Financial Modeling Prep)**: https://financialmodelingprep.com/developer/docs/ (free tier: 250 calls/day)
- **FRED**: https://fred.stlouisfed.org/docs/api/api_key.html (free)
- **BLS**: https://data.bls.gov/registrationEngine/ (optional, improves rate limits)

## Usage

### Run the Streamlit app:
```bash
streamlit run app.py
```

### Or load API keys from environment:
```bash
export FMP_API_KEY=your_key
export FRED_API_KEY=your_key
streamlit run app.py
```

## Project Structure

```
sector-opportunity-analyzer/
├── app.py                 # Streamlit application
├── config.py              # Configuration and settings
├── requirements.txt       # Python dependencies
├── .env.example           # Environment variable template
│
├── data/
│   ├── cache/             # Cached API responses
│   ├── cache_manager.py   # 12-hour caching logic
│   └── fetchers.py        # API connectors
│
├── analysis/
│   ├── signals.py         # Signal calculations
│   └── scoring.py         # Scoring engine
│
├── reports/               # Report generation (future)
└── utils/                 # Helper functions
```

## Scoring Methodology

The opportunity score (0-100) is calculated as a weighted average of five component scores:

| Component | Default Weight | Description |
|-----------|----------------|-------------|
| Momentum | 25% | Price performance, relative strength vs S&P 500 |
| Valuation | 20% | Forward P/E attractiveness (lower = better) |
| Growth | 20% | Employment growth trends |
| Innovation | 20% | R&D intensity (R&D as % of revenue) |
| Macro | 15% | Interest rate sensitivity |

Weights are adjustable in the sidebar.

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
