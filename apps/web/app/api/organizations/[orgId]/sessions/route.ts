import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { hasPermission, Permission, type OrgRoleType } from "@/lib/permissions";

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

// GET - List all active sessions for organization members
export async function GET(_request: NextRequest, { params }: RouteParams) {
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

    if (!membership || !hasPermission(membership.role as OrgRoleType, Permission.ORG_MANAGE_SESSIONS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all members of the organization
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      select: { userId: true },
    });

    const userIds = members.map((m) => m.userId);

    // Get active sessions for all organization members
    const sessions = await prisma.userSession.findMany({
      where: {
        userId: { in: userIds },
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        userId: true,
        ipAddress: true,
        userAgent: true,
        deviceInfo: true,
        lastActiveAt: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { lastActiveAt: "desc" },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("List sessions error:", error);
    return NextResponse.json(
      { error: "Failed to list sessions" },
      { status: 500 }
    );
  }
}

// DELETE - Revoke all sessions for the organization (except current user)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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

    if (!membership || !hasPermission(membership.role as OrgRoleType, Permission.ORG_MANAGE_SESSIONS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all members except current user
    const members = await prisma.organizationMember.findMany({
      where: {
        organizationId: orgId,
        userId: { not: session.user.id },
      },
      select: { userId: true },
    });

    const userIds = members.map((m) => m.userId);

    // Revoke all sessions for organization members (except current user)
    const result = await prisma.userSession.updateMany({
      where: {
        userId: { in: userIds },
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: session.user.id,
        action: "sessions.revoked_all",
        resourceType: "user_session",
        newValues: { count: result.count },
      },
    });

    return NextResponse.json({
      message: `${result.count} sessions revoked`,
      count: result.count,
    });
  } catch (error) {
    console.error("Revoke all sessions error:", error);
    return NextResponse.json(
      { error: "Failed to revoke sessions" },
      { status: 500 }
    );
  }
}
