import { NextResponse } from "next/server";
import { integrationProviders } from "@/lib/integrations/providers";

export async function GET() {
  return NextResponse.json({
    providers: integrationProviders,
  });
}
