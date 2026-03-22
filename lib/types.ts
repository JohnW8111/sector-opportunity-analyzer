// Domain model types for the sector opportunity analyzer.

export interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type PriceSeries = PriceBar[];
export type SectorPrices = Record<string, PriceSeries>;

export interface TimeSeries {
  dates: string[];
  values: number[];
}

export type MacroData = Record<string, TimeSeries>;
export type EmploymentData = Record<string, TimeSeries>;
export type RDData = Record<string, number>;

export interface AllData {
  sectorPrices: SectorPrices;
  sectorPE: Record<string, number>;
  macroData: MacroData;
  employmentData: EmploymentData;
  rdData: RDData;
  fetchedAt: string;
}

export interface SectorScore {
  sector: string;
  opportunityScore: number;
  rank: number;
  momentumScore: number;
  valuationScore: number;
  growthScore: number;
  innovationScore: number;
  macroScore: number;
  priceReturn3Mo?: number;
  priceReturn6Mo?: number;
  priceReturn12Mo?: number;
  relativeStrength?: number;
  forwardPE?: number;
  employmentGrowth?: number;
  rdIntensity?: number;
}

export interface SummaryReport {
  timestamp: string;
  topSectors: SectorRank[];
  bottomSectors: SectorRank[];
  scoreDistribution: ScoreDistribution;
  topSectorDrivers: string[];
  weightsUsed: Record<string, number>;
}

export interface SectorRank {
  rank: number;
  sector: string;
  score: number;
}

export interface ScoreDistribution {
  average: number;
  max: number;
  min: number;
  spread: number;
}

export interface DataQualityResult {
  source: string;
  status: "pass" | "fail" | "warning";
  message: string;
  details: Record<string, unknown>;
}
