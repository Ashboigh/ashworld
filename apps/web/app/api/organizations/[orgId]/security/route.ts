import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { hasPermission, Permission, type OrgRoleType } from "@/lib/permissions";
import { z } from "zod";

const securityPolicySchema = z.object({
  // Password Policy
  passwordMinLength: z.number().min(6).max(128).optional(),
  passwordRequireUpper: z.boolean().optional(),
  passwordRequireLower: z.boolean().optional(),
  passwordRequireNumber: z.boolean().optional(),
  passwordRequireSpecial: z.boolean().optional(),

  // Session Policy
  sessionTimeoutMinutes: z.number().min(5).max(525600).optional(), // 5 min to 1 year

  // MFA Policy
  mfaRequired: z.boolean().optional(),
  mfaRequiredRoles: z.array(z.string()).optional(),

  // IP Policy
  ipWhitelistEnabled: z.boolean().optional(),
  allowedIPs: z.array(z.string()).optional(),
});

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

// GET - Get security policy
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

    if (!membership || !hasPermission(membership.role as OrgRoleType, Permission.ORG_MANAGE_SECURITY)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let securityPolicy = await prisma.securityPolicy.findUnique({
      where: { organizationId: orgId },
    });

    // Return default values if no policy exists
    if (!securityPolicy) {
      securityPolicy = {
        id: "",
        organizationId: orgId,
        passwordMinLength: 8,
        passwordRequireUpper: true,
        passwordRequireLower: true,
        passwordRequireNumber: true,
        passwordRequireSpecial: false,
        sessionTimeoutMinutes: 43200, // 30 days
        mfaRequired: false,
        mfaRequiredRoles: [],
        ipWhitelistEnabled: false,
        allowedIPs: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return NextResponse.json({ securityPolicy });
  } catch (error) {
    console.error("Get security policy error:", error);
    return NextResponse.json(
      { error: "Failed to get security policy" },
      { status: 500 }
    );
  }
}

// PUT - Update security policy
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    if (!membership || !hasPermission(membership.role as OrgRoleType, Permission.ORG_MANAGE_SECURITY)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const result = securityPolicySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const data = result.data;

    // Validate IP addresses if provided
    if (data.allowedIPs) {
      for (const ip of data.allowedIPs) {
        // Simple validation - check for valid IPv4 or CIDR
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
        if (!ipv4Regex.test(ip)) {
          return NextResponse.json(
            { error: `Invalid IP address or CIDR: ${ip}` },
            { status: 400 }
          );
        }
      }
    }

    // Get existing policy for audit log
    const existingPolicy = await prisma.securityPolicy.findUnique({
      where: { organizationId: orgId },
    });

    const securityPolicy = await prisma.securityPolicy.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        ...data,
      },
      update: data,
    });

    // Log the update
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: session.user.id,
        action: "security_policy.updated",
        resourceType: "security_policy",
        resourceId: securityPolicy.id,
        oldValues: existingPolicy
          ? {
              passwordMinLength: existingPolicy.passwordMinLength,
              mfaRequired: existingPolicy.mfaRequired,
              ipWhitelistEnabled: existingPolicy.ipWhitelistEnabled,
            }
          : undefined,
        newValues: {
          passwordMinLength: data.passwordMinLength,
          mfaRequired: data.mfaRequired,
          ipWhitelistEnabled: data.ipWhitelistEnabled,
        },
      },
    });

    return NextResponse.json({ securityPolicy });
  } catch (error) {
    console.error("Update security policy error:", error);
    return NextResponse.json(
      { error: "Failed to update security policy" },
      { status: 500 }
    );
  }
}
