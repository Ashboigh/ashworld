import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { hasPermission, Permission, type OrgRoleType } from "@/lib/permissions";
import { collectAnalyticsMetrics } from "@/lib/analytics/metrics";
import type { AnalyticsFilters } from "@/lib/analytics/types";

const metricQuerySchema = z.object({
  organizationId: z.string().cuid(),
  workspaceId: z.string().cuid().optional(),
  chatbotId: z.string().cuid().optional(),
  channelId: z.string().cuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const { success, data, error } = metricQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!success) {
      return NextResponse.json({ error: error?.issues?.[0]?.message || "Invalid query" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: data.organizationId,
          userId: session.user.id,
        },
      },
    });

    if (!membership || !hasPermission(membership.role as OrgRoleType, Permission.ANALYTICS_VIEW)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const filters: AnalyticsFilters = {
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      chatbotId: data.chatbotId,
      channelId: data.channelId,
      from: data.from ? new Date(data.from) : undefined,
      to: data.to ? new Date(data.to) : undefined,
    };

    const result = await collectAnalyticsMetrics(filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Analytics metrics error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics metrics" }, { status: 500 });
  }
}
