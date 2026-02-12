import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { hasPermission, Permission, type OrgRoleType } from "@/lib/permissions";

interface RouteParams {
  params: Promise<{ orgId: string; keyId: string }>;
}

// GET - Get single API key details
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, keyId } = await params;
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

    if (!membership || !hasPermission(membership.role as OrgRoleType, Permission.ORG_VIEW_API_KEYS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: keyId,
        organizationId: orgId,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        ipWhitelist: true,
        expiresAt: true,
        lastUsedAt: true,
        usageCount: true,
        revokedAt: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!apiKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    return NextResponse.json({ apiKey });
  } catch (error) {
    console.error("Get API key error:", error);
    return NextResponse.json(
      { error: "Failed to get API key" },
      { status: 500 }
    );
  }
}

// DELETE - Revoke API key
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, keyId } = await params;
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

    if (!membership || !hasPermission(membership.role as OrgRoleType, Permission.ORG_MANAGE_API_KEYS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: keyId,
        organizationId: orgId,
        revokedAt: null,
      },
    });

    if (!apiKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    // Revoke the key (soft delete)
    await prisma.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });

    // Log the revocation
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: session.user.id,
        action: "api_key.revoked",
        resourceType: "api_key",
        resourceId: keyId,
        oldValues: { name: apiKey.name },
      },
    });

    return NextResponse.json({ message: "API key revoked successfully" });
  } catch (error) {
    console.error("Revoke API key error:", error);
    return NextResponse.json(
      { error: "Failed to revoke API key" },
      { status: 500 }
    );
  }
}
