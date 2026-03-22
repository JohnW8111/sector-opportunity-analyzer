import { NextResponse } from "next/server";
import { fetchAllData } from "@/lib/fetch-all-data";
import { calculateScores, getSummaryReport } from "@/lib/analysis/scoring";
import { DEFAULT_WEIGHTS } from "@/lib/config";

export async function GET() {
  try {
    const allData = await fetchAllData();
    const scores = calculateScores(allData);
    const summary = getSummaryReport(scores, DEFAULT_WEIGHTS);

    return NextResponse.json(summary);
  } catch (err) {
    console.error("Summary error:", err);
    return NextResponse.json(
      { error: "internal_error", message: String(err) },
      { status: 500 }
    );
  }
}
