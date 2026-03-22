// Bureau of Labor Statistics employment data fetcher.

import type { TimeSeries, EmploymentData } from "../types";
import { BLS_EMPLOYMENT_SERIES } from "../config";

export async function fetchBLSEmployment(
  yearsBack: number = 5
): Promise<EmploymentData> {
  const endYear = new Date().getFullYear();
  const startYear = endYear - yearsBack;

  const seriesIds = Object.values(BLS_EMPLOYMENT_SERIES);
  const seriesIdToSector: Record<string, string> = {};
  for (const [sector, id] of Object.entries(BLS_EMPLOYMENT_SERIES)) {
    seriesIdToSector[id] = sector;
  }

  const payload: Record<string, unknown> = {
    seriesid: seriesIds,
    startyear: startYear.toString(),
    endyear: endYear.toString(),
  };

  if (process.env.BLS_API_KEY) {
    payload.registrationkey = process.env.BLS_API_KEY;
  }

  const resp = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    throw new Error(`BLS API returned ${resp.status}`);
  }

  const data = await resp.json();

  if (data.status !== "REQUEST_SUCCEEDED") {
    throw new Error(`BLS API error: ${JSON.stringify(data.message)}`);
  }

  const employmentData: EmploymentData = {};

  for (const series of data.Results?.series || []) {
    const sector = seriesIdToSector[series.seriesID];
    if (!sector) continue;

    const dates: string[] = [];
    const values: number[] = [];

    // BLS returns newest first — collect then reverse
    const entries: { date: string; value: number }[] = [];

    for (const item of series.data || []) {
      const year = parseInt(item.year);
      const monthStr = item.period?.replace("M", "") || "";
      const month = parseInt(monthStr);
      if (month < 1 || month > 12) continue;

      const value = parseFloat(item.value);
      if (isNaN(value)) continue;

      const date = `${year}-${String(month).padStart(2, "0")}-01`;
      entries.push({ date, value });
    }

    // Sort ascending by date
    entries.sort((a, b) => a.date.localeCompare(b.date));

    for (const entry of entries) {
      dates.push(entry.date);
      values.push(entry.value);
    }

    if (values.length > 0) {
      employmentData[sector] = { dates, values };
    }
  }

  return employmentData;
}
