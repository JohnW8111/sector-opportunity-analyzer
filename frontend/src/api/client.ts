import axios from 'axios';
import type {
  ScoresResponse,
  SummaryResponse,
  DataQualityResponse,
  CacheInfo,
  Weights,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function fetchScores(weights?: Partial<Weights>, refresh = false): Promise<ScoresResponse> {
  const params = new URLSearchParams();
  if (weights) {
    Object.entries(weights).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });
  }
  if (refresh) {
    params.append('refresh', 'true');
  }
  const response = await api.get<ScoresResponse>(`/scores?${params.toString()}`);
  return response.data;
}

export async function fetchSummary(weights?: Partial<Weights>): Promise<SummaryResponse> {
  const params = new URLSearchParams();
  if (weights) {
    Object.entries(weights).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });
  }
  const response = await api.get<SummaryResponse>(`/scores/summary?${params.toString()}`);
  return response.data;
}

export async function fetchDataQuality(): Promise<DataQualityResponse> {
  const response = await api.get<DataQualityResponse>('/data/quality');
  return response.data;
}

export async function fetchSectors(): Promise<string[]> {
  const response = await api.get<{ sectors: string[] }>('/data/sectors');
  return response.data.sectors;
}

export async function fetchCacheInfo(): Promise<CacheInfo> {
  const response = await api.get<CacheInfo>('/cache/info');
  return response.data;
}

export async function clearCache(): Promise<{ files_removed: number; message: string }> {
  const response = await api.post<{ files_removed: number; message: string }>('/cache/clear');
  return response.data;
}
