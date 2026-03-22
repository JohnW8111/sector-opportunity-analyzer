import { NextResponse } from "next/server";
import { SECTOR_NAMES } from "@/lib/config";

export async function GET() {
  return NextResponse.json({ sectors: [...SECTOR_NAMES] });
}
