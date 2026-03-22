// Orchestrates fetching from all data sources in parallel.
// Includes a module-level TTL cache to avoid redundant external API calls
// when multiple routes are hit within the same time window.

import type { AllData } from "./types";
import { fetchSectorPrices, fetchSectorPE } from "./data-sources/yahoo";
import { fetchMacroData } from "./data-sources/fred";
import { fetchBLSEmployment } from "./data-sources/bls";
import { getRDData } from "./data-sources/rd-data";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let cachedData: AllData | null = null;
let cachedAt = 0;
let inflightPromise: Promise<AllData> | null = null;

async function fetchFresh(): Promise<AllData> {
  const [sectorPrices, sectorPE, macroData, employmentData] =
    await Promise.all([
      fetchSectorPrices().catch((err) => {
        console.error("Yahoo prices error:", err);
        return {};
      }),
      fetchSectorPE().catch((err) => {
        console.error("Yahoo PE error:", err);
        return {};
      }),
      fetchMacroData(5).catch((err) => {
        console.error("FRED error:", err);
        return {};
      }),
      fetchBLSEmployment(5).catch((err) => {
        console.error("BLS error:", err);
        return {};
      }),
    ]);

  return {
    sectorPrices,
    sectorPE,
    macroData,
    employmentData,
    rdData: getRDData(),
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchAllData(): Promise<AllData> {
  // Return cached data if fresh enough
  if (cachedData && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedData;
  }

  // Singleflight: if a fetch is already in progress, share its promise
  if (inflightPromise) {
    return inflightPromise;
  }

  inflightPromise = fetchFresh()
    .then((data) => {
      cachedData = data;
      cachedAt = Date.now();
      return data;
    })
    .finally(() => {
      inflightPromise = null;
    });

  return inflightPromise;
}
