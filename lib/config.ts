// Sector configuration, weights, and API mappings.

export const SECTOR_ETFS: Record<string, string> = {
  "Information Technology": "XLK",
  "Financials": "XLF",
  "Energy": "XLE",
  "Health Care": "XLV",
  "Consumer Discretionary": "XLY",
  "Consumer Staples": "XLP",
  "Industrials": "XLI",
  "Materials": "XLB",
  "Utilities": "XLU",
  "Real Estate": "XLRE",
  "Communication Services": "XLC",
};

export const SECTOR_NAMES = [
  "Information Technology",
  "Financials",
  "Energy",
  "Health Care",
  "Consumer Discretionary",
  "Consumer Staples",
  "Industrials",
  "Materials",
  "Utilities",
  "Real Estate",
  "Communication Services",
] as const;

export const MARKET_BENCHMARK = "SPY";

export const DEFAULT_WEIGHTS: Record<string, number> = {
  momentum: 0.25,
  valuation: 0.20,
  growth: 0.20,
  innovation: 0.20,
  macro: 0.15,
};

export const MOMENTUM_PERIODS = [3, 6, 12]; // months

export const BLS_EMPLOYMENT_SERIES: Record<string, string> = {
  "Information Technology": "CES6000000001",
  "Financials": "CES5500000001",
  "Energy": "CES1021000001",
  "Health Care": "CES6562000001",
  "Consumer Discretionary": "CES4200000001",
  "Consumer Staples": "CES3100000001",
  "Industrials": "CES3000000001",
  "Materials": "CES1021200001",
  "Utilities": "CES4422000001",
  "Real Estate": "CES5553000001",
  "Communication Services": "CES5000000001",
};

export const FRED_SERIES: Record<string, string> = {
  treasury_10y: "DGS10",
  treasury_2y: "DGS2",
  fed_funds: "FEDFUNDS",
  cpi: "CPIAUCSL",
  core_cpi: "CPILFESL",
  gdp: "GDP",
};

// FRED republishes these identical seasonally adjusted BLS CES series.
// Aggregate series use FRED aliases; the FRED notes list the original CES code.
export const FRED_EMPLOYMENT_SERIES: Record<string, string> = {
  CES6000000001: "USPBS",
  CES5500000001: "USFIRE",
  CES1021000001: "CES1021000001",
  CES6562000001: "CES6562000001",
  CES4200000001: "USTRADE",
  CES3100000001: "DMANEMP",
  CES3000000001: "MANEMP",
  CES1021200001: "CES1021200001",
  CES4422000001: "CES4422000001",
  CES5553000001: "CES5553000001",
  CES5000000001: "USINFO",
};

export const REVALIDATE_SECONDS = 43200; // 12 hours
