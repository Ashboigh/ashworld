import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { hasPermission, Permission, type OrgRoleType } from "@/lib/permissions";

interface RouteParams {
  params: Promise<{ orgId: string; sessionId: string }>;
}

// DELETE - Revoke a specific session
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, sessionId } = await params;
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

    // Get the session and verify it belongs to an org member
    const userSession = await prisma.userSession.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          include: {
            organizationMembers: {
              where: { organizationId: orgId },
            },
          },
        },
      },
    });

    if (!userSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (userSession.user.organizationMembers.length === 0) {
      return NextResponse.json(
        { error: "Session does not belong to an organization member" },
        { status: 403 }
      );
    }

    if (userSession.revokedAt) {
      return NextResponse.json(
        { error: "Session already revoked" },
        { status: 400 }
      );
    }

    // Revoke the session
    await prisma.userSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: session.user.id,
        action: "session.revoked",
        resourceType: "user_session",
        resourceId: sessionId,
        newValues: {
          targetUserId: userSession.userId,
          targetUserEmail: userSession.user.email,
        },
      },
    });

    return NextResponse.json({ message: "Session revoked" });
  } catch (error) {
    console.error("Revoke session error:", error);
    return NextResponse.json(
      { error: "Failed to revoke session" },
      { status: 500 }
    );
  }
}
