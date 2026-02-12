import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { hasPermission, Permission, type OrgRoleType } from "@/lib/permissions";
import { generateApiKey } from "@/lib/api-keys";

interface RouteParams {
  params: Promise<{ orgId: string; keyId: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
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

    const existingKey = await prisma.apiKey.findFirst({
      where: {
        id: keyId,
        organizationId: orgId,
        revokedAt: null,
      },
    });

    if (!existingKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    const { key, keyHash, keyPrefix } = generateApiKey();

    const newKey = await prisma.$transaction(async (tx) => {
      await tx.apiKey.update({
        where: { id: keyId },
        data: { revokedAt: new Date() },
      });

      return tx.apiKey.create({
        data: {
          organizationId: orgId,
          name: existingKey.name,
          keyHash,
          keyPrefix,
          scopes: existingKey.scopes,
          ipWhitelist: existingKey.ipWhitelist,
          expiresAt: existingKey.expiresAt,
          createdById: session.user.id,
        },
      });
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: session.user.id,
        action: "api_key.rotated",
        resourceType: "api_key",
        resourceId: existingKey.id,
        newValues: {
          newApiKeyId: newKey.id,
        },
      },
    });

    return NextResponse.json({
      apiKey: {
        id: newKey.id,
        name: newKey.name,
        keyPrefix: newKey.keyPrefix,
        scopes: newKey.scopes,
        ipWhitelist: newKey.ipWhitelist,
        expiresAt: newKey.expiresAt,
        createdAt: newKey.createdAt,
      },
      key,
      message: "API key rotated. Save the new value—it cannot be shown again.",
    });
  } catch (error) {
    console.error("Rotate API key error:", error);
    return NextResponse.json(
      { error: "Failed to rotate API key" },
      { status: 500 }
    );
  }
}
