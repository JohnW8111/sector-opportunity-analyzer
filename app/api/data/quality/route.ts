import { NextResponse } from "next/server";
import { fetchAllData } from "@/lib/fetch-all-data";
import { getEmploymentQuality } from "@/lib/employment-quality";
import type { DataQualityResult } from "@/lib/types";

export async function GET() {
  try {
    const allData = await fetchAllData();
    const results: DataQualityResult[] = [];

    // FMP Prices
    const priceCount = Object.keys(allData.sectorPrices).filter(
      (k) => k !== "_benchmark"
    ).length;
    const priceDays = Object.entries(allData.sectorPrices)
      .filter(([k]) => k !== "_benchmark")
      .map(([, s]) => s.length);
    const minDays = priceDays.length > 0 ? Math.min(...priceDays) : 0;

    results.push({
      source: "Yahoo Finance Prices",
      status: priceCount >= 10 && minDays >= 20 ? "pass" : "fail",
      message: `${priceCount} sectors with price data, min ${minDays} days`,
      details: { sectors: priceCount, minDays },
    });

    // FMP Sector P/E
    const peCount = Object.values(allData.sectorPE).filter((v) => v > 0).length;
    results.push({
      source: "Yahoo Finance P/E",
      status: peCount >= 8 ? "pass" : peCount >= 5 ? "warning" : "fail",
      message: `${peCount} sectors with P/E data`,
      details: { sectors: peCount },
    });

    // FRED Macro
    const fredCount = Object.keys(allData.macroData).length;
    const fredSeries = Object.entries(allData.macroData).map(([name, ts]) => ({
      name,
      observations: ts.values.length,
    }));
    results.push({
      source: "FRED Macro",
      status: fredCount >= 3 ? "pass" : "fail",
      message: `${fredCount} FRED series loaded`,
      details: { series: fredSeries },
    });

    // BLS Employment
    results.push(getEmploymentQuality(allData.employmentData));

    // R&D Data
    const rdCount = Object.values(allData.rdData).filter((v) => v > 0).length;
    results.push({
      source: "R&D Intensity",
      status: rdCount >= 8 ? "pass" : "fail",
      message: `${rdCount} sectors with R&D data (hardcoded)`,
      details: { sectors: rdCount },
    });

    const overallStatus = results.every((r) => r.status === "pass")
      ? "pass"
      : results.some((r) => r.status === "fail")
        ? "fail"
        : "warning";

    return NextResponse.json({
      overall: overallStatus,
      sources: results,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Data quality error:", err);
    return NextResponse.json(
      { error: "internal_error", message: String(err) },
      { status: 500 }
    );
  }
}
