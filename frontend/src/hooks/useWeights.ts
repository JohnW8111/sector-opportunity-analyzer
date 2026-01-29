import { useState, useCallback, useMemo } from 'react';
import { DEFAULT_WEIGHTS, type Weights } from '../types';

export function useWeights(initialWeights: Weights = DEFAULT_WEIGHTS) {
  const [weights, setWeights] = useState<Weights>(initialWeights);

  const updateWeight = useCallback((key: keyof Weights, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetWeights = useCallback(() => {
    setWeights(DEFAULT_WEIGHTS);
  }, []);

  // Normalized weights that sum to 1.0
  const normalizedWeights = useMemo((): Weights => {
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    if (total === 0) return DEFAULT_WEIGHTS;
    return {
      momentum: weights.momentum / total,
      valuation: weights.valuation / total,
      growth: weights.growth / total,
      innovation: weights.innovation / total,
      macro: weights.macro / total,
    };
  }, [weights]);

  const totalWeight = useMemo(() => {
    return Object.values(weights).reduce((sum, w) => sum + w, 0);
  }, [weights]);

  return {
    weights,
    normalizedWeights,
    totalWeight,
    updateWeight,
    resetWeights,
  };
}
