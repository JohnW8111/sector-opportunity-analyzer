// Weighted composite scoring engine.

import type { AllData, SectorScore, SummaryReport } from "../types";
import { SECTOR_NAMES, DEFAULT_WEIGHTS } from "../config";
import {
  calculateMomentumScore,
  calculateValuationScore,
  calculateGrowthScore,
  calculateInnovationScore,
  calculateMacroScore,
  calculatePriceReturns,
  calculateRelativeStrength,
  calculateEmploymentGrowth,
} from "./signals";

function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (sum > 0 && Math.abs(sum - 1.0) > 0.01) {
    const normalized: Record<string, number> = {};
    for (const [k, v] of Object.entries(weights)) {
      normalized[k] = v / sum;
    }
    return normalized;
  }
  return { ...weights };
}

export function calculateScores(
  allData: AllData,
  customWeights?: Record<string, number>
): SectorScore[] {
  const weights = normalizeWeights(customWeights ?? DEFAULT_WEIGHTS);

  // Calculate component scores
  const momentumScores = calculateMomentumScore(allData.sectorPrices);
  const valuationScores = calculateValuationScore(allData.sectorPE);
  const growthScores = calculateGrowthScore(allData.employmentData);
  const innovationScores = calculateInnovationScore(allData.rdData);
  const macroScores = calculateMacroScore(allData.sectorPrices, allData.macroData);

  // Raw metrics for display
  const priceReturns = calculatePriceReturns(allData.sectorPrices);
  const relStrength = calculateRelativeStrength(allData.sectorPrices, 12);
  const employmentGrowth = calculateEmploymentGrowth(allData.employmentData);

  const scores: SectorScore[] = [];

  for (const sector of SECTOR_NAMES) {
    const momentum = momentumScores[sector] ?? 50.0;
    const valuation = valuationScores[sector] ?? 50.0;
    const growth = growthScores[sector] ?? 50.0;
    const innovation = innovationScores[sector] ?? 50.0;
    const macro = macroScores[sector] ?? 50.0;

    const opportunity =
      (weights.momentum ?? 0.25) * momentum +
      (weights.valuation ?? 0.20) * valuation +
      (weights.growth ?? 0.20) * growth +
      (weights.innovation ?? 0.20) * innovation +
      (weights.macro ?? 0.15) * macro;

    const score: SectorScore = {
      sector,
      opportunityScore: Math.round(opportunity * 100) / 100,
      rank: 0,
      momentumScore: momentum,
      valuationScore: valuation,
      growthScore: growth,
      innovationScore: innovation,
      macroScore: macro,
    };

    // Raw metrics
    const returns = priceReturns[sector];
    if (returns) {
      if (returns["3mo"] !== undefined) score.priceReturn3Mo = Math.round(returns["3mo"] * 100) / 100;
      if (returns["6mo"] !== undefined) score.priceReturn6Mo = Math.round(returns["6mo"] * 100) / 100;
      if (returns["12mo"] !== undefined) score.priceReturn12Mo = Math.round(returns["12mo"] * 100) / 100;
    }

    if (relStrength[sector] !== undefined) {
      score.relativeStrength = Math.round(relStrength[sector] * 100) / 100;
    }

    if (allData.sectorPE[sector] !== undefined) {
      score.forwardPE = Math.round(allData.sectorPE[sector] * 100) / 100;
    }

    if (employmentGrowth[sector] !== undefined) {
      score.employmentGrowth = Math.round(employmentGrowth[sector] * 100) / 100;
    }

    if (allData.rdData[sector] !== undefined) {
      score.rdIntensity = allData.rdData[sector];
    }

    scores.push(score);
  }

  // Sort by opportunity score descending, assign ranks
  scores.sort((a, b) => b.opportunityScore - a.opportunityScore);
  scores.forEach((s, i) => (s.rank = i + 1));

  return scores;
}

export function getSummaryReport(
  scores: SectorScore[],
  weights: Record<string, number>
): SummaryReport {
  if (scores.length === 0) {
    return {
      timestamp: new Date().toISOString(),
      topSectors: [],
      bottomSectors: [],
      scoreDistribution: { average: 0, max: 0, min: 0, spread: 0 },
      topSectorDrivers: [],
      weightsUsed: weights,
    };
  }

  const topSectors = scores.slice(0, 3).map((s) => ({
    rank: s.rank,
    sector: s.sector,
    score: s.opportunityScore,
  }));

  const bottomSectors = scores.slice(-3).map((s) => ({
    rank: s.rank,
    sector: s.sector,
    score: s.opportunityScore,
  }));

  const allScores = scores.map((s) => s.opportunityScore);
  const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  const max = Math.max(...allScores);
  const min = Math.min(...allScores);

  // Identify top sector drivers
  const drivers: string[] = [];
  const top = scores[0];
  if (top.momentumScore >= 70) drivers.push("strong momentum");
  if (top.valuationScore >= 70) drivers.push("attractive valuation");
  if (top.growthScore >= 70) drivers.push("employment growth");
  if (top.innovationScore >= 70) drivers.push("high R&D investment");
  if (top.macroScore >= 70) drivers.push("favorable macro positioning");

  return {
    timestamp: new Date().toISOString(),
    topSectors,
    bottomSectors,
    scoreDistribution: {
      average: Math.round(avg * 100) / 100,
      max: Math.round(max * 100) / 100,
      min: Math.round(min * 100) / 100,
      spread: Math.round((max - min) * 100) / 100,
    },
    topSectorDrivers: drivers,
    weightsUsed: weights,
  };
}
