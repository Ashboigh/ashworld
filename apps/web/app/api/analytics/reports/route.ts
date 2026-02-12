import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { hasPermission, Permission, type OrgRoleType } from "@/lib/permissions";

const baseFiltersSchema = z.object({
  workspaceId: z.string().cuid().optional(),
  chatbotId: z.string().cuid().optional(),
  channelId: z.string().cuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const reportScheduleSchema = z.object({
  organizationId: z.string().cuid(),
  name: z.string().min(1),
  cadence: z.enum(["hourly", "daily", "weekly", "monthly"]),
  format: z.enum(["json", "csv"]).default("json"),
  filters: baseFiltersSchema.optional(),
});

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organizationId");
    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: session.user.id,
        },
      },
    });

    if (!membership || !hasPermission(membership.role as OrgRoleType, Permission.ANALYTICS_EXPORT)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const schedules = await prisma.analyticsReportSchedule.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error("Analytics reports fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch report schedules" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = reportScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: parsed.data.organizationId,
          userId: session.user.id,
        },
      },
    });

    if (!membership || !hasPermission(membership.role as OrgRoleType, Permission.ANALYTICS_EXPORT)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const now = new Date();
    const nextRunAt = new Date(now);
    switch (parsed.data.cadence) {
      case "hourly":
        nextRunAt.setHours(nextRunAt.getHours() + 1);
        break;
      case "daily":
        nextRunAt.setDate(nextRunAt.getDate() + 1);
        break;
      case "weekly":
        nextRunAt.setDate(nextRunAt.getDate() + 7);
        break;
      case "monthly":
        nextRunAt.setMonth(nextRunAt.getMonth() + 1);
        break;
    }

    const schedule = await prisma.analyticsReportSchedule.create({
      data: {
        organizationId: parsed.data.organizationId,
        name: parsed.data.name,
        cadence: parsed.data.cadence,
        format: parsed.data.format,
        filters: parsed.data.filters ?? {},
        nextRunAt,
      },
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("Analytics report create error:", error);
    return NextResponse.json({ error: "Failed to create report schedule" }, { status: 500 });
  }
}
