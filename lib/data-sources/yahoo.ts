// Yahoo Finance data fetcher — ported from Go data/fetchers.go.
// No API key needed. Uses v8 chart API for prices, v10 quoteSummary for P/E.

import type { PriceSeries, SectorPrices } from "../types";
import { SECTOR_ETFS, MARKET_BENCHMARK, SECTOR_NAMES } from "../config";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

// --- Price History (no auth required) ---

export async function fetchYahooHistory(
  ticker: string,
  yearsBack: number = 5
): Promise<PriceSeries> {
  const end = Math.floor(Date.now() / 1000);
  const start = Math.floor(
    new Date(
      new Date().getFullYear() - yearsBack,
      new Date().getMonth(),
      new Date().getDate()
    ).getTime() / 1000
  );

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${start}&period2=${end}&interval=1d&includePrePost=false`;

  const resp = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!resp.ok) {
    throw new Error(`Yahoo Finance returned ${resp.status} for ${ticker}`);
  }

  const data = await resp.json();
  const result = data?.chart?.result?.[0];
  if (!result) {
    throw new Error(`No data returned for ${ticker}`);
  }

  const timestamps: number[] = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0];
  if (!quote) {
    throw new Error(`No quote data for ${ticker}`);
  }

  const open: number[] = quote.open ?? [];
  const high: number[] = quote.high ?? [];
  const low: number[] = quote.low ?? [];
  const close: number[] = quote.close ?? [];
  const volume: number[] = quote.volume ?? [];

  const series: PriceSeries = [];
  for (let i = 0; i < timestamps.length; i++) {
    const c = close[i];
    if (c == null || c === 0) continue;

    series.push({
      date: new Date(timestamps[i] * 1000).toISOString().split("T")[0],
      open: open[i] ?? 0,
      high: high[i] ?? 0,
      low: low[i] ?? 0,
      close: c,
      volume: volume[i] ?? 0,
    });
  }

  return series;
}

export async function fetchSectorPrices(): Promise<SectorPrices> {
  const prices: SectorPrices = {};

  const tickers: { key: string; ticker: string }[] = [];
  for (const sector of SECTOR_NAMES) {
    tickers.push({ key: sector, ticker: SECTOR_ETFS[sector] });
  }
  tickers.push({ key: "_benchmark", ticker: MARKET_BENCHMARK });

  const results = await Promise.allSettled(
    tickers.map(async ({ key, ticker }) => {
      const series = await fetchYahooHistory(ticker, 5);
      return { key, series };
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.series.length > 0) {
      prices[result.value.key] = result.value.series;
    }
  }

  return prices;
}

// --- P/E Data (requires cookie+crumb auth) ---

let cachedCrumb: { cookies: string; crumb: string } | null = null;

async function getYahooCrumb(): Promise<{ cookies: string; crumb: string }> {
  if (cachedCrumb) return cachedCrumb;

  // Step 1: Get consent cookie
  const cookieResp = await fetch("https://fc.yahoo.com/cusc/t", {
    headers: { "User-Agent": USER_AGENT },
    redirect: "manual",
  });

  const setCookies = cookieResp.headers.getSetCookie?.() ?? [];
  const cookieHeader = setCookies
    .map((c) => c.split(";")[0])
    .join("; ");

  if (!cookieHeader) {
    throw new Error("No cookies returned from Yahoo");
  }

  // Step 2: Get crumb using the cookie
  const crumbResp = await fetch(
    "https://query2.finance.yahoo.com/v1/test/getcrumb",
    {
      headers: {
        "User-Agent": USER_AGENT,
        Cookie: cookieHeader,
      },
    }
  );

  const crumb = (await crumbResp.text()).trim();
  if (!crumb || crumb.includes("Too Many") || crumb.includes("Unauthorized")) {
    throw new Error(`Invalid crumb response: ${crumb}`);
  }

  cachedCrumb = { cookies: cookieHeader, crumb };
  return cachedCrumb;
}

async function fetchYahooInfo(
  ticker: string,
  auth: { cookies: string; crumb: string }
): Promise<{ forwardPE?: number; trailingPE?: number }> {
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=summaryDetail,defaultKeyStatistics&crumb=${encodeURIComponent(auth.crumb)}`;

  const resp = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Cookie: auth.cookies,
    },
  });

  if (!resp.ok) {
    throw new Error(`Yahoo returned ${resp.status} for ${ticker}`);
  }

  const data = await resp.json();
  const result = data?.quoteSummary?.result?.[0];
  if (!result) return {};

  let forwardPE: number | undefined;
  let trailingPE: number | undefined;

  const sdForwardPE = result.summaryDetail?.forwardPE?.raw;
  const dksForwardPE = result.defaultKeyStatistics?.forwardPE?.raw;
  const sdTrailingPE = result.summaryDetail?.trailingPE?.raw;

  if (sdForwardPE && sdForwardPE > 0) forwardPE = sdForwardPE;
  else if (dksForwardPE && dksForwardPE > 0) forwardPE = dksForwardPE;

  if (sdTrailingPE && sdTrailingPE > 0) trailingPE = sdTrailingPE;

  // Fallback: use trailing if no forward
  if (!forwardPE && trailingPE) forwardPE = trailingPE;

  return { forwardPE, trailingPE };
}

export async function fetchSectorPE(): Promise<Record<string, number>> {
  const peMap: Record<string, number> = {};

  let auth: { cookies: string; crumb: string };
  try {
    auth = await getYahooCrumb();
  } catch (err) {
    console.warn("Could not authenticate with Yahoo Finance:", err);
    return peMap;
  }

  const results = await Promise.allSettled(
    SECTOR_NAMES.map(async (sector) => {
      const ticker = SECTOR_ETFS[sector];
      const info = await fetchYahooInfo(ticker, auth);
      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 200));
      return { sector, pe: info.forwardPE ?? null };
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.pe) {
      peMap[result.value.sector] = result.value.pe;
    }
  }

  return peMap;
}
