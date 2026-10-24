// BLS employment data, with the identical BLS series from FRED as a fallback.

import type { EmploymentData } from "../types";
import { BLS_EMPLOYMENT_SERIES, FRED_EMPLOYMENT_SERIES } from "../config";
import { fetchFREDSeries } from "./fred";

interface BLSResponse {
  status?: string;
  Results?: {
    series?: {
      seriesID: string;
      data?: { year: string; period: string; value: string }[];
    }[];
  };
}

export async function fetchBLSEmployment(
  yearsBack: number = 5
): Promise<EmploymentData> {
  const endYear = new Date().getFullYear();
  const startYear = endYear - yearsBack;
  const employmentData: EmploymentData = {};
  const seriesIdToSector = Object.fromEntries(
    Object.entries(BLS_EMPLOYMENT_SERIES).map(([sector, id]) => [id, sector])
  );

  try {
    const resp = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seriesid: Object.keys(seriesIdToSector),
        startyear: String(startYear),
        endyear: String(endYear),
        ...(process.env.BLS_API_KEY
          ? { registrationkey: process.env.BLS_API_KEY }
          : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data: BLSResponse = await resp.json();
    // Do not log upstream response bodies: a provider can echo credentials.
    if (data.status !== "REQUEST_SUCCEEDED") {
      throw new Error("request rejected");
    }

    for (const series of data.Results?.series ?? []) {
      const sector = seriesIdToSector[series.seriesID];
      if (!sector) continue;

      const entries = new Map<string, number>();
      for (const item of series.data ?? []) {
        if (!/^\d{4}$/.test(item.year) || !/^M(0[1-9]|1[0-2])$/.test(item.period)) {
          continue; // Excludes annual averages (M13) and malformed dates.
        }
        const value = Number(item.value);
        if (!item.value.trim() || !Number.isFinite(value) || value <= 0) continue;
        entries.set(`${item.year}-${item.period.slice(1)}-01`, value);
      }
      const dates = [...entries.keys()].sort();
      if (dates.length > 0) {
        employmentData[sector] = {
          dates,
          values: dates.map((date) => entries.get(date)!),
          source: "bls",
          seriesId: series.seriesID,
        };
      }
    }
  } catch {
    console.warn("BLS employment request unavailable; trying the same BLS series via FRED.");
  }

  // A successful BLS response can still omit series or contain no usable data.
  const missing = Object.entries(BLS_EMPLOYMENT_SERIES).filter(
    ([sector]) => (employmentData[sector]?.values.length ?? 0) < 13
  );
  const startDate = new Date(Date.UTC(startYear, 0, 1));
  await Promise.all(
    missing.map(async ([sector, blsId]) => {
      const fredId = FRED_EMPLOYMENT_SERIES[blsId];
      if (!fredId) return;
      try {
        const series = await fetchFREDSeries(fredId, startDate);
        if (series.values.length >= 13) {
          employmentData[sector] = { ...series, source: "fred", seriesId: fredId };
        }
      } catch {
        console.warn(`Employment data unavailable for ${sector} (${fredId}).`);
      }
    })
  );

  if (Object.keys(employmentData).length === 0) {
    throw new Error("Employment data unavailable from both BLS and FRED");
  }
  return employmentData;
}
