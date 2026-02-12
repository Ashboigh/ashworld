import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { hasPermission, Permission, type OrgRoleType } from "@/lib/permissions";
import { generateApiKey } from "@/lib/api-keys";
import { validateScopes } from "@/lib/api-keys/scopes";
import { z } from "zod";

const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  scopes: z.array(z.string()).min(1, "At least one scope is required"),
  expiresAt: z.string().datetime().optional().nullable(),
  ipWhitelist: z.array(z.string()).optional().default([]),
});

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

// GET - List all API keys for organization
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user membership and permission
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

    const apiKeys = await prisma.apiKey.findMany({
      where: {
        organizationId: orgId,
        revokedAt: null,
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ apiKeys });
  } catch (error) {
    console.error("List API keys error:", error);
    return NextResponse.json(
      { error: "Failed to list API keys" },
      { status: 500 }
    );
  }
}

// POST - Create new API key
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user membership and permission
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

    const body = await request.json();
    const result = createApiKeySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { name, scopes, expiresAt, ipWhitelist } = result.data;

    // Validate scopes
    const scopeValidation = validateScopes(scopes);
    if (!scopeValidation.valid) {
      return NextResponse.json(
        { error: `Invalid scopes: ${scopeValidation.invalidScopes.join(", ")}` },
        { status: 400 }
      );
    }

    // Generate API key
    const { key, keyPrefix, keyHash } = generateApiKey();

    // Create API key record
    const apiKey = await prisma.apiKey.create({
      data: {
        organizationId: orgId,
        name,
        keyHash,
        keyPrefix,
        scopes,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        ipWhitelist,
        createdById: session.user.id,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        ipWhitelist: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Log the creation
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: session.user.id,
        action: "api_key.created",
        resourceType: "api_key",
        resourceId: apiKey.id,
        newValues: { name, scopes },
      },
    });

    return NextResponse.json({
      apiKey,
      key, // Return full key only once!
      message: "API key created. Save this key - it won't be shown again.",
    }, { status: 201 });
  } catch (error) {
    console.error("Create API key error:", error);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}
