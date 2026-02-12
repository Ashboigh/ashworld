import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { hasPermission, Permission, type OrgRoleType } from "@/lib/permissions";
import {
  getSAMLCallbackUrl,
  getOIDCCallbackUrl,
  getSAMLMetadataUrl,
} from "@/lib/sso";
import { z } from "zod";

const ssoConfigSchema = z.object({
  provider: z.enum(["saml", "oidc"]),
  enabled: z.boolean().optional(),
  enforceSSO: z.boolean().optional(),

  // SAML fields
  samlEntryPoint: z.string().url().optional().nullable(),
  samlIssuer: z.string().optional().nullable(),
  samlCertificate: z.string().optional().nullable(),

  // OIDC fields
  oidcClientId: z.string().optional().nullable(),
  oidcClientSecret: z.string().optional().nullable(),
  oidcIssuerUrl: z.string().url().optional().nullable(),
  oidcScopes: z.array(z.string()).optional(),

  allowedDomains: z.array(z.string()).optional(),
});

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

// GET - Get SSO configuration
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

    if (!membership || !hasPermission(membership.role as OrgRoleType, Permission.ORG_MANAGE_SSO)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { slug: true },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const ssoConfig = await prisma.sSOConfig.findUnique({
      where: { organizationId: orgId },
    });

    // Generate callback URLs for setup
    const callbackUrls = {
      saml: getSAMLCallbackUrl(org.slug),
      oidc: getOIDCCallbackUrl(org.slug),
      samlMetadata: getSAMLMetadataUrl(org.slug),
    };

    return NextResponse.json({
      ssoConfig: ssoConfig
        ? {
            ...ssoConfig,
            // Don't expose secrets
            oidcClientSecret: ssoConfig.oidcClientSecret ? "••••••••" : null,
          }
        : null,
      callbackUrls,
    });
  } catch (error) {
    console.error("Get SSO config error:", error);
    return NextResponse.json(
      { error: "Failed to get SSO configuration" },
      { status: 500 }
    );
  }
}

// PUT - Update SSO configuration
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

    if (!membership || !hasPermission(membership.role as OrgRoleType, Permission.ORG_MANAGE_SSO)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const result = ssoConfigSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const data = result.data;

    // Get existing config to preserve secret if not changed
    const existingConfig = await prisma.sSOConfig.findUnique({
      where: { organizationId: orgId },
    });

    // If oidcClientSecret is masked, keep the existing value
    const oidcClientSecret =
      data.oidcClientSecret === "••••••••"
        ? existingConfig?.oidcClientSecret
        : data.oidcClientSecret;

    const ssoConfig = await prisma.sSOConfig.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        provider: data.provider,
        enabled: data.enabled ?? false,
        enforceSSO: data.enforceSSO ?? false,
        samlEntryPoint: data.samlEntryPoint,
        samlIssuer: data.samlIssuer,
        samlCertificate: data.samlCertificate,
        oidcClientId: data.oidcClientId,
        oidcClientSecret: oidcClientSecret,
        oidcIssuerUrl: data.oidcIssuerUrl,
        oidcScopes: data.oidcScopes ?? ["openid", "email", "profile"],
        allowedDomains: data.allowedDomains ?? [],
      },
      update: {
        provider: data.provider,
        enabled: data.enabled,
        enforceSSO: data.enforceSSO,
        samlEntryPoint: data.samlEntryPoint,
        samlIssuer: data.samlIssuer,
        samlCertificate: data.samlCertificate,
        oidcClientId: data.oidcClientId,
        oidcClientSecret: oidcClientSecret,
        oidcIssuerUrl: data.oidcIssuerUrl,
        oidcScopes: data.oidcScopes,
        allowedDomains: data.allowedDomains,
      },
    });

    // Log the update
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: session.user.id,
        action: "sso.updated",
        resourceType: "sso_config",
        resourceId: ssoConfig.id,
        newValues: { provider: data.provider, enabled: data.enabled },
      },
    });

    return NextResponse.json({
      ssoConfig: {
        ...ssoConfig,
        oidcClientSecret: ssoConfig.oidcClientSecret ? "••••••••" : null,
      },
    });
  } catch (error) {
    console.error("Update SSO config error:", error);
    return NextResponse.json(
      { error: "Failed to update SSO configuration" },
      { status: 500 }
    );
  }
}

// DELETE - Disable and remove SSO configuration
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

    if (!membership || !hasPermission(membership.role as OrgRoleType, Permission.ORG_MANAGE_SSO)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.sSOConfig.delete({
      where: { organizationId: orgId },
    });

    // Log the deletion
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: session.user.id,
        action: "sso.deleted",
        resourceType: "sso_config",
      },
    });

    return NextResponse.json({ message: "SSO configuration removed" });
  } catch (error) {
    console.error("Delete SSO config error:", error);
    return NextResponse.json(
      { error: "Failed to delete SSO configuration" },
      { status: 500 }
    );
  }
}
