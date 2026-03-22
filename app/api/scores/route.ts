import { NextResponse } from "next/server";
import { fetchAllData } from "@/lib/fetch-all-data";
import { calculateScores } from "@/lib/analysis/scoring";
import { DEFAULT_WEIGHTS } from "@/lib/config";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse optional custom weights
    const weights = { ...DEFAULT_WEIGHTS };
    for (const key of ["momentum", "valuation", "growth", "innovation", "macro"]) {
      const val = searchParams.get(key);
      if (val) {
        const num = parseFloat(val);
        if (!isNaN(num) && num >= 0) weights[key] = num;
      }
    }

    const allData = await fetchAllData();
    const scores = calculateScores(allData, weights);

    return NextResponse.json({
      sectors: scores,
      weights_used: weights,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Scores error:", err);
    return NextResponse.json(
      { error: "internal_error", message: String(err) },
      { status: 500 }
    );
  }
}
