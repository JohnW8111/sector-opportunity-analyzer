export interface SectorScore {
  sector: string;
  opportunity_score: number;
  rank: number;
  momentum_score: number;
  valuation_score: number;
  growth_score: number;
  innovation_score: number;
  macro_score: number;
  price_return_3mo: number | null;
  price_return_6mo: number | null;
  price_return_12mo: number | null;
  relative_strength: number | null;
  forward_pe: number | null;
  employment_growth: number | null;
  rd_intensity: number | null;
}

export interface ScoresResponse {
  scores: SectorScore[];
  weights_used: Record<string, number>;
  timestamp: string;
}

export interface SummaryResponse {
  top_sectors: Array<{ sector: string; score: number }>;
  bottom_sectors: Array<{ sector: string; score: number }>;
  score_distribution: Record<string, number>;
  top_sector_drivers: Record<string, string>;
  weights_used: Record<string, number>;
  timestamp: string;
}

export interface DataSourceStatus {
  name: string;
  status: 'ok' | 'error' | 'warning';
  message: string | null;
}

export interface DataQualityResponse {
  sources: DataSourceStatus[];
  overall_status: 'ok' | 'error' | 'warning';
}

export interface CacheInfo {
  total_files: number;
  valid_files: number;
  expired_files: number;
  total_size_mb: number;
}

export interface Weights {
  momentum: number;
  valuation: number;
  growth: number;
  innovation: number;
  macro: number;
}

export const DEFAULT_WEIGHTS: Weights = {
  momentum: 0.25,
  valuation: 0.20,
  growth: 0.20,
  innovation: 0.20,
  macro: 0.15,
};
