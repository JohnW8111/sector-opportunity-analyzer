import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchScores, fetchSummary, fetchDataQuality, fetchCacheInfo, clearCache } from '../api/client';
import type { Weights } from '../types';

export function useScores(weights?: Partial<Weights>, enabled = true) {
  return useQuery({
    queryKey: ['scores', weights],
    queryFn: () => fetchScores(weights),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSummary(weights?: Partial<Weights>) {
  return useQuery({
    queryKey: ['summary', weights],
    queryFn: () => fetchSummary(weights),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDataQuality() {
  return useQuery({
    queryKey: ['dataQuality'],
    queryFn: fetchDataQuality,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCacheInfo() {
  return useQuery({
    queryKey: ['cacheInfo'],
    queryFn: fetchCacheInfo,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useClearCache() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearCache,
    onSuccess: () => {
      // Invalidate all queries to refetch fresh data
      queryClient.invalidateQueries();
    },
  });
}

export function useRefreshScores() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (weights?: Partial<Weights>) => fetchScores(weights, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scores'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}
