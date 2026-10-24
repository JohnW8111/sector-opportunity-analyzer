import { SECTOR_NAMES } from "./config";
import type { DataQualityResult, EmploymentData } from "./types";

export function getEmploymentQuality(
  employment: EmploymentData,
  now = new Date()
): DataQualityResult {
  const missingSectors = SECTOR_NAMES.filter(
    (sector) => (employment[sector]?.values.length ?? 0) < 13
  );
  const staleBefore = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1))
    .toISOString().slice(0, 10);
  const staleSectors = SECTOR_NAMES.filter((sector) => {
    const dates = employment[sector]?.dates ?? [];
    return dates.length > 0 && dates[dates.length - 1] < staleBefore;
  });
  const series = Object.entries(employment).map(([sector, ts]) => ({
    sector,
    source: ts.source,
    seriesId: ts.seriesId,
    observations: ts.values.length,
    latestObservation: ts.dates[ts.dates.length - 1],
  }));
  const minMonths = series.length > 0
    ? Math.min(...series.map((s) => s.observations)) : 0;
  const fallbackSectors = series.filter((s) => s.source === "fred").map((s) => s.sector);
  const status = missingSectors.length > 0 ? "fail" : staleSectors.length > 0 ? "warning" : "pass";
  const message = missingSectors.length > 0
    ? `Employment history missing or incomplete for ${missingSectors.length} sectors; affected growth scores use 50.`
    : staleSectors.length > 0
      ? `Employment data is more than three months old for ${staleSectors.length} sectors.`
      : `${series.length} sectors, min ${minMonths} months${fallbackSectors.length > 0 ? `; ${fallbackSectors.length} supplied by FRED (BLS source)` : "; supplied by BLS"}.`;

  return {
    source: "BLS Employment",
    status,
    message,
    details: { sectors: series.length, minMonths, fallbackSectors, missingSectors, staleSectors, series },
  };
}
