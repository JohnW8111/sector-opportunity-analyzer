import assert from "node:assert/strict";
import { afterEach, beforeEach, test, mock } from "node:test";
import { fetchBLSEmployment } from "../lib/data-sources/bls";
import { BLS_EMPLOYMENT_SERIES, FRED_EMPLOYMENT_SERIES, SECTOR_NAMES } from "../lib/config";
import { getEmploymentQuality } from "../lib/employment-quality";
import type { EmploymentData } from "../lib/types";

const dates = Array.from({ length: 13 }, (_, i) => {
  const date = new Date(Date.UTC(2025, 8 + i, 1));
  return date.toISOString().slice(0, 10);
});
const observations = dates.map((date, i) => ({ date, value: String(100 + i) }));
const originalFetch = globalThis.fetch;
const originalFredKey = process.env.FRED_API_KEY;
const originalBlsKey = process.env.BLS_API_KEY;
const now = new Date("2026-10-24T00:00:00Z");
let warnings: string[] = [];

beforeEach(() => {
  process.env.FRED_API_KEY = "test-fred-secret";
  process.env.BLS_API_KEY = "test-bls-secret";
  warnings = [];
  mock.method(console, "warn", (...args: unknown[]) => { warnings.push(args.map(String).join(" ")); });
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalFredKey === undefined) delete process.env.FRED_API_KEY;
  else process.env.FRED_API_KEY = originalFredKey;
  if (originalBlsKey === undefined) delete process.env.BLS_API_KEY;
  else process.env.BLS_API_KEY = originalBlsKey;
  mock.restoreAll();
});

function blsSeries(id: string) {
  return {
    seriesID: id,
    data: observations.map(({ date, value }) => ({
      year: date.slice(0, 4), period: `M${date.slice(5, 7)}`, value,
    })).reverse(),
  };
}
function completeEmployment(): EmploymentData {
  return Object.fromEntries(SECTOR_NAMES.map((sector) => [sector, {
    dates: [...dates], values: observations.map((o) => Number(o.value)),
    source: "fred", seriesId: FRED_EMPLOYMENT_SERIES[BLS_EMPLOYMENT_SERIES[sector]],
  }]));
}

test("a complete BLS response uses no FRED calls and excludes annual averages", async () => {
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.match(String(url), /api.bls.gov/);
    const payload = JSON.parse(String(init?.body));
    assert.equal(payload.registrationkey, "test-bls-secret");
    assert.ok(init?.signal);
    const series = Object.values(BLS_EMPLOYMENT_SERIES).map(blsSeries);
    series[0].data.push({ year: "2025", period: "M13", value: "99999" });
    series[0].data.push({ year: "2025", period: "garbage", value: "99999" });
    return Response.json({ status: "REQUEST_SUCCEEDED", Results: { series } });
  };
  const result = await fetchBLSEmployment();
  assert.equal(calls, 1);
  assert.equal(Object.keys(result).length, 11);
  assert.deepEqual(result[SECTOR_NAMES[0]].dates, dates);
  assert.equal(result[SECTOR_NAMES[0]].values.length, 13);
  assert.equal(result[SECTOR_NAMES[0]].source, "bls");
});

test("a BLS HTML 503 restores all 11 original employment series through FRED", async () => {
  const fredIds: string[] = [];
  globalThis.fetch = async (url, init) => {
    if (String(url).includes("api.bls.gov")) return new Response("<html>busy</html>", { status: 503 });
    const parsed = new URL(String(url));
    assert.equal(parsed.hostname, "api.stlouisfed.org");
    assert.equal(parsed.searchParams.get("api_key"), "test-fred-secret");
    assert.ok(init?.signal);
    fredIds.push(parsed.searchParams.get("series_id")!);
    return Response.json({ observations });
  };
  const result = await fetchBLSEmployment();
  assert.equal(Object.keys(result).length, 11);
  assert.deepEqual(fredIds.sort(), Object.values(FRED_EMPLOYMENT_SERIES).sort());
  assert.ok(Object.values(result).every((ts) => ts.source === "fred"));
  assert.equal(getEmploymentQuality(result, now).status, "pass");
});

test("an incomplete successful BLS response fills only the missing sectors", async () => {
  let fredCalls = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes("api.bls.gov")) return Response.json({
      status: "REQUEST_SUCCEEDED", Results: { series: [blsSeries(BLS_EMPLOYMENT_SERIES.Energy)] },
    });
    fredCalls++;
    return Response.json({ observations });
  };
  const result = await fetchBLSEmployment();
  assert.equal(fredCalls, 10);
  assert.equal(result.Energy.source, "bls");
  assert.equal(result.Financials.source, "fred");
});

test("network timeouts and BLS application errors also trigger fallback", async () => {
  for (const failure of ["timeout", "rejected", "malformed"]) {
    globalThis.fetch = async (url) => {
      if (!String(url).includes("api.bls.gov")) return Response.json({ observations });
      if (failure === "timeout") throw new DOMException("timeout", "TimeoutError");
      if (failure === "malformed") return new Response("<html>busy</html>");
      return Response.json({ status: "REQUEST_FAILED", message: ["test-bls-secret"] });
    };
    assert.equal(Object.keys(await fetchBLSEmployment()).length, 11);
  }
  assert.ok(warnings.every((warning) => !warning.includes("test-bls-secret")));
});

test("partial FRED failure preserves healthy series and reports missing growth data", async () => {
  globalThis.fetch = async (url) => {
    if (String(url).includes("api.bls.gov")) return new Response("busy", { status: 503 });
    if (new URL(String(url)).searchParams.get("series_id") === "USPBS") {
      return new Response("unavailable", { status: 503 });
    }
    return Response.json({ observations });
  };
  const result = await fetchBLSEmployment();
  assert.equal(Object.keys(result).length, 10);
  const quality = getEmploymentQuality(result, now);
  assert.equal(quality.status, "fail");
  assert.deepEqual(quality.details.missingSectors, ["Information Technology"]);
});

test("both providers failing rejects instead of claiming healthy employment data", async () => {
  globalThis.fetch = async () => new Response("unavailable", { status: 503 });
  await assert.rejects(fetchBLSEmployment(), /unavailable from both BLS and FRED/);
  delete process.env.FRED_API_KEY;
  await assert.rejects(fetchBLSEmployment(), /unavailable from both BLS and FRED/);
  assert.equal(getEmploymentQuality({}, now).status, "fail");
});

test("quality warns when a populated employment series stops updating", () => {
  const data = completeEmployment();
  data.Energy.dates = dates.map((date) => date.replace("2026", "2025"));
  const quality = getEmploymentQuality(data, now);
  assert.equal(quality.status, "warning");
  assert.deepEqual(quality.details.staleSectors, ["Energy"]);
});
