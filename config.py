"""
Configuration settings for Sector Opportunity Analyzer
"""

# =============================================================================
# SECTOR DEFINITIONS
# =============================================================================

# GICS Sectors with their SPDR ETF tickers
SECTOR_ETFS = {
    'Information Technology': 'XLK',
    'Financials': 'XLF',
    'Energy': 'XLE',
    'Health Care': 'XLV',
    'Consumer Discretionary': 'XLY',
    'Consumer Staples': 'XLP',
    'Industrials': 'XLI',
    'Materials': 'XLB',
    'Utilities': 'XLU',
    'Real Estate': 'XLRE',
    'Communication Services': 'XLC',
}

# S&P 500 ETF for relative strength calculations
MARKET_BENCHMARK = 'SPY'

# =============================================================================
# CACHE SETTINGS
# =============================================================================

CACHE_DURATION_HOURS = 12
CACHE_DIR = 'data/cache'

# =============================================================================
# API KEYS (set via environment variables)
# =============================================================================

# FRED API - get free key at https://fred.stlouisfed.org/docs/api/api_key.html
# Set as environment variable: FRED_API_KEY
FRED_API_KEY_ENV = 'FRED_API_KEY'

# BLS API - optional, works without key but with lower rate limits
# Set as environment variable: BLS_API_KEY
BLS_API_KEY_ENV = 'BLS_API_KEY'

# =============================================================================
# SCORING WEIGHTS
# =============================================================================

SCORING_WEIGHTS = {
    'momentum': 0.25,      # Price performance, relative strength
    'valuation': 0.20,     # Forward P/E attractiveness
    'growth': 0.20,        # Employment growth
    'innovation': 0.20,    # R&D intensity (+ patents later)
    'macro': 0.15,         # Interest rate sensitivity
}

# =============================================================================
# SIGNAL PARAMETERS
# =============================================================================

# Momentum lookback periods (in months)
MOMENTUM_PERIODS = [3, 6, 12]

# Historical period for macro sensitivity calculations (years)
MACRO_SENSITIVITY_YEARS = 5

# Historical period for P/E comparison (years)
PE_HISTORICAL_YEARS = 5

# =============================================================================
# BLS SERIES IDS FOR EMPLOYMENT BY SECTOR
# =============================================================================

# CES (Current Employment Statistics) series for sector employment
# Format: CES + supersector code + industry code + data type
BLS_EMPLOYMENT_SERIES = {
    'Information Technology': 'CES6000000001',      # Information sector (closest proxy)
    'Financials': 'CES5500000001',                  # Financial activities
    'Energy': 'CES1021000001',                      # Mining and logging (includes oil/gas)
    'Health Care': 'CES6562000001',                 # Health care and social assistance
    'Consumer Discretionary': 'CES4200000001',      # Retail trade (proxy)
    'Consumer Staples': 'CES3100000001',            # Manufacturing - nondurable goods
    'Industrials': 'CES3000000001',                 # Manufacturing
    'Materials': 'CES1021200001',                   # Mining (except oil and gas)
    'Utilities': 'CES4422000001',                   # Utilities
    'Real Estate': 'CES5553000001',                 # Real estate
    'Communication Services': 'CES5000000001',      # Information (telecom, media)
}

# =============================================================================
# FRED SERIES FOR MACRO DATA
# =============================================================================

FRED_SERIES = {
    'treasury_10y': 'DGS10',           # 10-Year Treasury Rate
    'treasury_2y': 'DGS2',             # 2-Year Treasury Rate
    'fed_funds': 'FEDFUNDS',           # Federal Funds Rate
    'cpi': 'CPIAUCSL',                 # Consumer Price Index
    'core_cpi': 'CPILFESL',            # Core CPI (less food/energy)
    'gdp': 'GDP',                      # Gross Domestic Product
}

# =============================================================================
# DAMODARAN DATA URL
# =============================================================================

DAMODARAN_RD_URL = 'https://pages.stern.nyu.edu/~adamodar/pc/datasets/R&D.xls'

# Mapping from Damodaran industry names to GICS sectors
# This will need refinement based on actual Damodaran categories
DAMODARAN_TO_GICS = {
    'Software (System & Application)': 'Information Technology',
    'Software (Entertainment)': 'Information Technology',
    'Software (Internet)': 'Information Technology',
    'Semiconductor': 'Information Technology',
    'Semiconductor Equip': 'Information Technology',
    'Computer Services': 'Information Technology',
    'Computers/Peripherals': 'Information Technology',
    'Electronics (Consumer & Office)': 'Information Technology',
    'Electronics (General)': 'Information Technology',
    'Banks (Regional)': 'Financials',
    'Banks (Money Center)': 'Financials',
    'Financial Svcs. (Non-bank & Insurance)': 'Financials',
    'Insurance (General)': 'Financials',
    'Insurance (Life)': 'Financials',
    'Insurance (Prop/Cas.)': 'Financials',
    'Brokerage & Investment Banking': 'Financials',
    'Oil/Gas (Production and Exploration)': 'Energy',
    'Oil/Gas (Integrated)': 'Energy',
    'Oil/Gas Distribution': 'Energy',
    'Oilfield Svcs/Equip.': 'Energy',
    'Healthcare Products': 'Health Care',
    'Healthcare Support Services': 'Health Care',
    'Healthcare Information and Technology': 'Health Care',
    'Hospitals/Healthcare Facilities': 'Health Care',
    'Drugs (Pharmaceutical)': 'Health Care',
    'Drugs (Biotechnology)': 'Health Care',
    'Medical Supplies': 'Health Care',
    'Retail (General)': 'Consumer Discretionary',
    'Retail (Online)': 'Consumer Discretionary',
    'Retail (Special Lines)': 'Consumer Discretionary',
    'Auto & Truck': 'Consumer Discretionary',
    'Auto Parts': 'Consumer Discretionary',
    'Apparel': 'Consumer Discretionary',
    'Restaurant/Dining': 'Consumer Discretionary',
    'Hotel/Gaming': 'Consumer Discretionary',
    'Household Products': 'Consumer Staples',
    'Food Processing': 'Consumer Staples',
    'Beverage (Alcoholic)': 'Consumer Staples',
    'Beverage (Soft)': 'Consumer Staples',
    'Tobacco': 'Consumer Staples',
    'Aerospace/Defense': 'Industrials',
    'Air Transport': 'Industrials',
    'Trucking': 'Industrials',
    'Transportation': 'Industrials',
    'Machinery': 'Industrials',
    'Industrial Services': 'Industrials',
    'Building Materials': 'Industrials',
    'Engineering/Construction': 'Industrials',
    'Metals & Mining': 'Materials',
    'Steel': 'Materials',
    'Chemical (Basic)': 'Materials',
    'Chemical (Diversified)': 'Materials',
    'Chemical (Specialty)': 'Materials',
    'Paper/Forest Products': 'Materials',
    'Packaging & Container': 'Materials',
    'Utility (General)': 'Utilities',
    'Utility (Water)': 'Utilities',
    'Power': 'Utilities',
    'R.E.I.T.': 'Real Estate',
    'Real Estate (General/Diversified)': 'Real Estate',
    'Real Estate (Development)': 'Real Estate',
    'Real Estate (Operations & Services)': 'Real Estate',
    'Telecom Services': 'Communication Services',
    'Telecom. Equipment': 'Communication Services',
    'Broadcasting': 'Communication Services',
    'Cable TV': 'Communication Services',
    'Entertainment': 'Communication Services',
    'Publishing & Newspapers': 'Communication Services',
    'Advertising': 'Communication Services',
}
