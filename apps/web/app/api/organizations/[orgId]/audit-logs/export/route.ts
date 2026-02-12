import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { hasPermission, Permission, type OrgRoleType } from "@/lib/permissions";

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

// GET - Export audit logs as CSV
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: session.user.id,
        },
      },
    });

    if (!membership || !hasPermission(membership.role as OrgRoleType, Permission.ORG_EXPORT_AUDIT_LOGS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const format = searchParams.get("format") || "csv";

    // Build filter conditions
    const where: Record<string, unknown> = {
      organizationId: orgId,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.createdAt as Record<string, Date>).lte = new Date(endDate);
      }
    }

    // Limit export to last 10,000 records
    const logs = await prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        resourceType: true,
        resourceId: true,
        oldValues: true,
        newValues: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    // Log the export action
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: session.user.id,
        action: "audit_logs.exported",
        resourceType: "audit_log",
        newValues: { count: logs.length, format },
      },
    });

    if (format === "json") {
      return NextResponse.json({ logs });
    }

    // Generate CSV
    const csvHeaders = [
      "ID",
      "Timestamp",
      "User Email",
      "User Name",
      "Action",
      "Resource Type",
      "Resource ID",
      "IP Address",
      "User Agent",
      "Old Values",
      "New Values",
    ];

    const csvRows = logs.map((log) => [
      log.id,
      log.createdAt.toISOString(),
      log.user?.email || "",
      log.user ? `${log.user.firstName || ""} ${log.user.lastName || ""}`.trim() : "",
      log.action,
      log.resourceType || "",
      log.resourceId || "",
      log.ipAddress || "",
      log.userAgent || "",
      log.oldValues ? JSON.stringify(log.oldValues) : "",
      log.newValues ? JSON.stringify(log.newValues) : "",
    ]);

    const escapeCSV = (value: string) => {
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csv = [
      csvHeaders.join(","),
      ...csvRows.map((row) => row.map((cell) => escapeCSV(String(cell))).join(",")),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export audit logs error:", error);
    return NextResponse.json(
      { error: "Failed to export audit logs" },
      { status: 500 }
    );
  }
}
