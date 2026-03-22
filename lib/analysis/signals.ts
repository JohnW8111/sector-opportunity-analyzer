// Signal calculations for sector opportunity scoring.
// Uses simple-statistics for correlation and standard deviation.

import { sampleCorrelation, sampleStandardDeviation, mean } from "simple-statistics";
import type { PriceSeries, SectorPrices, TimeSeries, EmploymentData, RDData, MacroData } from "../types";
import { SECTOR_NAMES, MOMENTUM_PERIODS } from "../config";

// --- Normalization ---

export function normalizeMinMax(
  values: Record<string, number>,
  higherIsBetter: boolean
): Record<string, number> {
  const keys = Object.keys(values);
  if (keys.length === 0) return {};

  const vals = Object.values(values);
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);

  if (maxVal === minVal) {
    const result: Record<string, number> = {};
    for (const k of keys) result[k] = 50.0;
    return result;
  }

  const result: Record<string, number> = {};
  for (const [sector, val] of Object.entries(values)) {
    let score = ((val - minVal) / (maxVal - minVal)) * 100;
    if (!higherIsBetter) score = 100 - score;
    result[sector] = Math.round(score * 100) / 100;
  }
  return result;
}

export function normalizeZScore(
  values: Record<string, number>,
  higherIsBetter: boolean
): Record<string, number> {
  const keys = Object.keys(values);
  if (keys.length === 0) return {};

  const vals = Object.values(values);
  const m = mean(vals);
  const std = sampleStandardDeviation(vals);

  if (std === 0) {
    const result: Record<string, number> = {};
    for (const k of keys) result[k] = 50.0;
    return result;
  }

  const result: Record<string, number> = {};
  for (const [sector, val] of Object.entries(values)) {
    const z = (val - m) / std;
    let score = 50 + z * 15;
    score = Math.max(0, Math.min(100, score));
    if (!higherIsBetter) score = 100 - score;
    result[sector] = Math.round(score * 100) / 100;
  }
  return result;
}

// --- Momentum ---

function periodKey(months: number): string {
  return `${months}mo`;
}

export function calculatePriceReturns(
  prices: SectorPrices
): Record<string, Record<string, number>> {
  const returns: Record<string, Record<string, number>> = {};

  for (const [sector, series] of Object.entries(prices)) {
    if (sector === "_benchmark" || series.length < 20) continue;

    const sectorReturns: Record<string, number> = {};
    for (const months of MOMENTUM_PERIODS) {
      const tradingDays = months * 21;
      if (series.length >= tradingDays) {
        const startPrice = series[series.length - tradingDays].close;
        const endPrice = series[series.length - 1].close;
        sectorReturns[periodKey(months)] = ((endPrice - startPrice) / startPrice) * 100;
      }
    }

    if (Object.keys(sectorReturns).length > 0) {
      returns[sector] = sectorReturns;
    }
  }

  return returns;
}

export function calculateRelativeStrength(
  prices: SectorPrices,
  periodMonths: number
): Record<string, number> {
  const benchmark = prices["_benchmark"];
  if (!benchmark || benchmark.length === 0) return {};

  const tradingDays = periodMonths * 21;
  if (benchmark.length < tradingDays) return {};

  const benchmarkReturn =
    (benchmark[benchmark.length - 1].close /
      benchmark[benchmark.length - tradingDays].close -
      1) * 100;

  const relStrength: Record<string, number> = {};
  for (const [sector, series] of Object.entries(prices)) {
    if (sector === "_benchmark" || series.length < tradingDays) continue;
    const sectorReturn =
      (series[series.length - 1].close /
        series[series.length - tradingDays].close -
        1) * 100;
    relStrength[sector] = sectorReturn - benchmarkReturn;
  }

  return relStrength;
}

export function calculateVolumeTrend(
  prices: SectorPrices,
  shortPeriod: number = 20,
  longPeriod: number = 50
): Record<string, number> {
  const trends: Record<string, number> = {};

  for (const [sector, series] of Object.entries(prices)) {
    if (sector === "_benchmark" || series.length < longPeriod) continue;

    let shortSum = 0;
    for (let i = series.length - shortPeriod; i < series.length; i++) {
      shortSum += series[i].volume;
    }
    const shortAvg = shortSum / shortPeriod;

    let longSum = 0;
    for (let i = series.length - longPeriod; i < series.length; i++) {
      longSum += series[i].volume;
    }
    const longAvg = longSum / longPeriod;

    if (longAvg > 0) {
      trends[sector] = ((shortAvg - longAvg) / longAvg) * 100;
    }
  }

  return trends;
}

export function calculateMomentumScore(prices: SectorPrices): Record<string, number> {
  const returns = calculatePriceReturns(prices);
  const relStrength = calculateRelativeStrength(prices, 12);
  const volumeTrend = calculateVolumeTrend(prices, 20, 50);

  // Extract 12-month returns
  const returns12mo: Record<string, number> = {};
  for (const [sector, rets] of Object.entries(returns)) {
    if (rets["12mo"] !== undefined) returns12mo[sector] = rets["12mo"];
  }

  const normReturns = normalizeZScore(returns12mo, true);
  const normRelStrength = normalizeZScore(relStrength, true);
  const normVolume = normalizeZScore(volumeTrend, true);

  const scores: Record<string, number> = {};
  for (const sector of SECTOR_NAMES) {
    const retScore = normReturns[sector] ?? 50.0;
    const rsScore = normRelStrength[sector] ?? 50.0;
    const volScore = normVolume[sector] ?? 50.0;
    const combined = 0.50 * retScore + 0.35 * rsScore + 0.15 * volScore;
    scores[sector] = Math.round(combined * 100) / 100;
  }

  return scores;
}

// --- Valuation ---

export function calculateValuationScore(
  sectorPE: Record<string, number>
): Record<string, number> {
  const validPE: Record<string, number> = {};
  for (const [sector, pe] of Object.entries(sectorPE)) {
    if (pe > 0) validPE[sector] = pe;
  }

  if (Object.keys(validPE).length === 0) return defaultScores();

  // Lower P/E = better value = higher score
  const scores = normalizeZScore(validPE, false);

  // Fill missing sectors
  for (const sector of SECTOR_NAMES) {
    if (scores[sector] === undefined) scores[sector] = 50.0;
  }

  return scores;
}

// --- Growth ---

export function calculateEmploymentGrowth(
  employment: EmploymentData
): Record<string, number> {
  const growthRates: Record<string, number> = {};

  for (const [sector, ts] of Object.entries(employment)) {
    if (ts.values.length < 13) continue;
    const current = ts.values[ts.values.length - 1];
    const yearAgo = ts.values[ts.values.length - 13];
    if (yearAgo > 0) {
      growthRates[sector] = ((current - yearAgo) / yearAgo) * 100;
    }
  }

  return growthRates;
}

export function calculateGrowthScore(employment: EmploymentData): Record<string, number> {
  const growth = calculateEmploymentGrowth(employment);
  if (Object.keys(growth).length === 0) return defaultScores();

  const scores = normalizeZScore(growth, true);
  for (const sector of SECTOR_NAMES) {
    if (scores[sector] === undefined) scores[sector] = 50.0;
  }
  return scores;
}

// --- Innovation ---

export function calculateInnovationScore(rdData: RDData): Record<string, number> {
  const validRD: Record<string, number> = {};
  for (const [sector, rd] of Object.entries(rdData)) {
    if (rd > 0) validRD[sector] = rd;
  }

  if (Object.keys(validRD).length === 0) return defaultScores();

  const scores = normalizeZScore(validRD, true);
  for (const sector of SECTOR_NAMES) {
    if (scores[sector] === undefined) scores[sector] = 30.0;
  }
  return scores;
}

// --- Macro ---

function monthlyChanges(ts: TimeSeries): number[] {
  if (ts.values.length < 2) return [];
  const changes: number[] = [];
  for (let i = 1; i < ts.values.length; i++) {
    if (ts.values[i - 1] !== 0) {
      changes.push((ts.values[i] - ts.values[i - 1]) / ts.values[i - 1]);
    }
  }
  return changes;
}

function monthlyReturnsFromPrices(series: PriceSeries): number[] {
  if (series.length < 21) return [];
  const returns: number[] = [];
  for (let i = 21; i < series.length; i += 21) {
    const prevPrice = series[i - 21].close;
    const currPrice = series[i].close;
    if (prevPrice > 0) {
      returns.push((currPrice - prevPrice) / prevPrice);
    }
  }
  return returns;
}

export function calculateRateSensitivity(
  prices: SectorPrices,
  interestRates: TimeSeries
): Record<string, number> {
  if (interestRates.values.length === 0) return {};

  const rateChanges = monthlyChanges(interestRates);
  const sensitivities: Record<string, number> = {};

  for (const [sector, series] of Object.entries(prices)) {
    if (sector === "_benchmark" || series.length < 252) continue;

    const sectorReturns = monthlyReturnsFromPrices(series);
    if (sectorReturns.length < 12 || rateChanges.length < 12) continue;

    const n = Math.min(sectorReturns.length, rateChanges.length);
    if (n < 12) continue;

    const returns = sectorReturns.slice(sectorReturns.length - n);
    const rates = rateChanges.slice(rateChanges.length - n);

    try {
      const corr = sampleCorrelation(returns, rates);
      if (!isNaN(corr)) {
        sensitivities[sector] = corr;
      }
    } catch {
      // sampleCorrelation can throw on degenerate input
    }
  }

  return sensitivities;
}

export function calculateMacroScore(
  prices: SectorPrices,
  macroData: MacroData
): Record<string, number> {
  const interestRates = macroData["treasury_10y"];
  if (!interestRates) return defaultScores();

  const sensitivity = calculateRateSensitivity(prices, interestRates);
  if (Object.keys(sensitivity).length === 0) return defaultScores();

  // Lower correlation = more resilient = higher score
  const scores = normalizeZScore(sensitivity, false);
  for (const sector of SECTOR_NAMES) {
    if (scores[sector] === undefined) scores[sector] = 50.0;
  }
  return scores;
}

// --- Helpers ---

function defaultScores(): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const sector of SECTOR_NAMES) {
    scores[sector] = 50.0;
  }
  return scores;
}
