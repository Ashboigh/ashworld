import { NextResponse } from "next/server";
import { listModelComparisons } from "@/lib/ai-optimization/model-comparison";

export async function GET() {
  return NextResponse.json({ models: listModelComparisons() });
}
