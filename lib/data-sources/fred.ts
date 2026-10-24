// FRED (Federal Reserve Economic Data) fetcher.

import type { TimeSeries, MacroData } from "../types";
import { FRED_SERIES } from "../config";

function getApiKey(): string {
  const key = process.env.FRED_API_KEY;
  if (!key) throw new Error("FRED_API_KEY not set");
  return key;
}

export async function fetchFREDSeries(
  seriesId: string,
  startDate: Date
): Promise<TimeSeries> {
  const apiKey = getApiKey();
  const start = startDate.toISOString().split("T")[0];

  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&observation_start=${start}`;

  const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!resp.ok) {
    throw new Error(`FRED API returned ${resp.status} for ${seriesId}`);
  }

  const data = await resp.json();
  const dates: string[] = [];
  const values: number[] = [];

  for (const obs of data.observations || []) {
    if (obs.value === ".") continue; // skip missing values
    const val = parseFloat(obs.value);
    if (isNaN(val)) continue;
    dates.push(obs.date);
    values.push(val);
  }

  return { dates, values };
}

export async function fetchMacroData(yearsBack: number = 5): Promise<MacroData> {
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - yearsBack);

  const macroData: MacroData = {};

  const results = await Promise.allSettled(
    Object.entries(FRED_SERIES).map(async ([name, seriesId]) => {
      const ts = await fetchFREDSeries(seriesId, startDate);
      return { name, ts };
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.ts.values.length > 0) {
      macroData[result.value.name] = result.value.ts;
    }
  }

  return macroData;
}
