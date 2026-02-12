import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { hasPermission, Permission, type OrgRoleType } from "@/lib/permissions";
import { collectAnalyticsEvents } from "@/lib/analytics/metrics";
import type { AnalyticsFilters } from "@/lib/analytics/types";

const exportQuerySchema = z.object({
  organizationId: z.string().cuid(),
  workspaceId: z.string().cuid().optional(),
  chatbotId: z.string().cuid().optional(),
  channelId: z.string().cuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  format: z.enum(["json", "csv"]).default("json"),
});

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const parsed = exportQuerySchema.safeParse(Object.fromEntries(url.searchParams));

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid query" }, { status: 400 });
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

    const filters: AnalyticsFilters = {
      organizationId: parsed.data.organizationId,
      workspaceId: parsed.data.workspaceId,
      chatbotId: parsed.data.chatbotId,
      channelId: parsed.data.channelId,
      from: parsed.data.from ? new Date(parsed.data.from) : undefined,
      to: parsed.data.to ? new Date(parsed.data.to) : undefined,
    };

    const events = await collectAnalyticsEvents(filters);

    if (parsed.data.format === "csv") {
      const header = "eventType,createdAt,channelId,conversationId,payload";
      const rows = events.map((event) => {
        const payload = JSON.stringify(event.payload ?? {});
        return `${event.eventType},${event.createdAt.toISOString()},${event.channelId ?? ""},${event.conversationId ?? ""},"${payload.replace(/"/g, '""')}"`;
      });
      const csv = [header, ...rows].join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=\"analytics.csv\"",
        },
      });
    }

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Analytics export error:", error);
    return NextResponse.json({ error: "Failed to export analytics" }, { status: 500 });
  }
}
