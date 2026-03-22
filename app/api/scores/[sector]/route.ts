import { NextResponse } from "next/server";
import { fetchAllData } from "@/lib/fetch-all-data";
import { calculateScores } from "@/lib/analysis/scoring";
import { SECTOR_NAMES } from "@/lib/config";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sector: string }> }
) {
  try {
    const { sector: sectorParam } = await params;
    const decoded = decodeURIComponent(sectorParam);

    // Case-insensitive sector lookup
    const sector = SECTOR_NAMES.find(
      (s) => s.toLowerCase() === decoded.toLowerCase()
    );

    if (!sector) {
      return NextResponse.json(
        {
          error: "not_found",
          message: `Sector "${decoded}" not found. Available: ${SECTOR_NAMES.join(", ")}`,
        },
        { status: 404 }
      );
    }

    const allData = await fetchAllData();
    const scores = calculateScores(allData);
    const sectorScore = scores.find((s) => s.sector === sector);

    if (!sectorScore) {
      return NextResponse.json(
        { error: "not_found", message: "Score not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(sectorScore);
  } catch (err) {
    console.error("Sector score error:", err);
    return NextResponse.json(
      { error: "internal_error", message: String(err) },
      { status: 500 }
    );
  }
}
