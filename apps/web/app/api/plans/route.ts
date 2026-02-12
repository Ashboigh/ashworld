import { NextResponse } from "next/server";
import { prisma } from "@repo/database";

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        priceMonthly: true,
        priceYearly: true,
        limits: true,
        features: true,
        sortOrder: true,
      },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("Failed to fetch plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}
