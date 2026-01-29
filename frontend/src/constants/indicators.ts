export interface IndicatorComponent {
  name: string;
  weight: string;
  calculation: string;
  source: string;
}

export interface IndicatorInfo {
  id: string;
  name: string;
  defaultWeight: string;
  summary: string;
  description: string;
  components: IndicatorComponent[];
  interpretationHigh: string;
  interpretationLow: string;
  dataSource: string;
  caveat: string;
}

export const INDICATORS: Record<string, IndicatorInfo> = {
  momentum: {
    id: 'momentum',
    name: 'Momentum',
    defaultWeight: '25%',
    summary: "How strongly a sector's price is trending upward relative to its history and the broader market.",
    description: 'Combines price returns, relative strength vs S&P 500, and volume trends to identify sectors with strong upward price momentum.',
    components: [
      {
        name: '12-Month Returns',
        weight: '50%',
        calculation: "(today's price - price 252 days ago) / price 252 days ago × 100",
        source: 'yfinance',
      },
      {
        name: 'Relative Strength',
        weight: '35%',
        calculation: "Sector's 12-month return minus S&P 500's 12-month return",
        source: 'yfinance',
      },
      {
        name: 'Volume Trend',
        weight: '15%',
        calculation: '(20-day avg volume - 50-day avg volume) / 50-day avg volume × 100',
        source: 'yfinance',
      },
    ],
    interpretationHigh: 'Sector is outperforming the market with strong price gains and increasing trading interest',
    interpretationLow: 'Sector is lagging, underperforming the S&P 500, possibly with declining volume',
    dataSource: 'yfinance (Yahoo Finance) - No API key required',
    caveat: "Momentum can reverse quickly. Past performance doesn't guarantee future results.",
  },
  valuation: {
    id: 'valuation',
    name: 'Valuation',
    defaultWeight: '20%',
    summary: "How 'cheap' or 'expensive' a sector is relative to other sectors, using forward P/E ratios.",
    description: 'Uses forward P/E ratios to identify sectors trading at attractive valuations. Lower P/E relative to peers results in higher scores (value investing perspective).',
    components: [
      {
        name: 'Forward P/E Ratio',
        weight: '100%',
        calculation: 'Current Price / Expected Earnings Per Share (next 12 months)',
        source: 'yfinance',
      },
    ],
    interpretationHigh: 'Sector is trading at lower multiples — potentially undervalued or out of favor',
    interpretationLow: "Sector is trading at premium multiples — market expects high growth (or it's overvalued)",
    dataSource: 'yfinance (Yahoo Finance) - No API key required',
    caveat: "Low P/E isn't always 'good' — it could signal expected declining earnings (value trap). High P/E isn't always 'bad' — growth sectors often deserve premium multiples.",
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    defaultWeight: '20%',
    summary: 'Employment growth trends by sector — a proxy for economic expansion in that sector.',
    description: 'Measures year-over-year employment growth using Bureau of Labor Statistics data. Sectors adding jobs faster than peers score higher.',
    components: [
      {
        name: 'YoY Employment Growth',
        weight: '100%',
        calculation: '(Current Employment - Employment 12 months ago) / Employment 12 months ago × 100',
        source: 'BLS',
      },
    ],
    interpretationHigh: 'Sector is adding jobs faster than peers — indicates business expansion, hiring, investment',
    interpretationLow: 'Sector is shedding jobs or growing slowly — potential contraction or automation',
    dataSource: 'Bureau of Labor Statistics (BLS) - API key optional (improves rate limits)',
    caveat: 'Employment is a lagging indicator. By the time hiring shows up in data, the trend may be mature.',
  },
  innovation: {
    id: 'innovation',
    name: 'Innovation',
    defaultWeight: '20%',
    summary: 'R&D intensity — how much a sector invests in research and development relative to revenue.',
    description: "Uses Damodaran's industry R&D data to identify sectors investing heavily in future products and services. Higher R&D intensity suggests potential for innovation-driven growth.",
    components: [
      {
        name: 'R&D Intensity',
        weight: '100%',
        calculation: 'R&D Spending / Total Revenue (as percentage)',
        source: 'Damodaran (NYU)',
      },
    ],
    interpretationHigh: 'Sector invests heavily in future products/services — potential for innovation-driven growth',
    interpretationLow: 'Sector spends little on R&D — mature, commoditized, or service-based',
    dataSource: 'Damodaran Online (NYU Stern) - No API key required',
    caveat: "High R&D doesn't guarantee success — it's an input, not an output. Some sectors (Financials, Utilities) naturally have low R&D.",
  },
  macro: {
    id: 'macro',
    name: 'Macro Sensitivity',
    defaultWeight: '15%',
    summary: "How a sector's returns correlate with interest rate changes — specifically the 10-Year Treasury yield.",
    description: 'Calculates correlation between sector returns and interest rate changes over 5 years. Sectors with lower correlation to rates score higher (more resilient to rate movements).',
    components: [
      {
        name: 'Rate Correlation',
        weight: '100%',
        calculation: 'Pearson correlation between monthly sector returns and 10Y Treasury rate changes',
        source: 'FRED + yfinance',
      },
    ],
    interpretationHigh: "Sector is resilient to interest rate changes — won't crash if rates move unexpectedly",
    interpretationLow: 'Sector is highly sensitive to rates — may suffer in volatile rate environments',
    dataSource: 'FRED (Federal Reserve) - API key required (free)',
    caveat: 'Current scoring favors rate resilience. Could be adjusted based on rate outlook — if you expect rates to fall, rate-sensitive sectors (Utilities, REITs) may outperform.',
  },
};

// Short tooltips for quick hover info
export const INDICATOR_TOOLTIPS: Record<string, string> = {
  momentum: 'Price performance & relative strength vs S&P 500',
  valuation: 'Forward P/E attractiveness (lower = better score)',
  growth: 'Employment growth trends from BLS data',
  innovation: 'R&D spending as % of revenue',
  macro: 'Resilience to interest rate changes',
  opportunity_score: 'Weighted average of all component scores',
};
