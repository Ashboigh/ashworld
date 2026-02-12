import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { hasPermission, Permission, type OrgRoleType } from "@/lib/permissions";
import {
  testSAMLConfiguration,
  testOIDCConfiguration,
  getSAMLCallbackUrl,
  getOIDCCallbackUrl,
} from "@/lib/sso";

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

// POST - Test SSO configuration
export async function POST(_request: NextRequest, { params }: RouteParams) {
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

    if (!ssoConfig) {
      return NextResponse.json(
        { error: "SSO configuration not found" },
        { status: 404 }
      );
    }

    let testResult;

    if (ssoConfig.provider === "saml") {
      if (!ssoConfig.samlEntryPoint || !ssoConfig.samlIssuer || !ssoConfig.samlCertificate) {
        return NextResponse.json(
          { error: "SAML configuration is incomplete" },
          { status: 400 }
        );
      }

      testResult = await testSAMLConfiguration({
        entryPoint: ssoConfig.samlEntryPoint,
        issuer: ssoConfig.samlIssuer,
        certificate: ssoConfig.samlCertificate,
        callbackUrl: getSAMLCallbackUrl(org.slug),
      });
    } else if (ssoConfig.provider === "oidc") {
      if (!ssoConfig.oidcClientId || !ssoConfig.oidcClientSecret || !ssoConfig.oidcIssuerUrl) {
        return NextResponse.json(
          { error: "OIDC configuration is incomplete" },
          { status: 400 }
        );
      }

      testResult = await testOIDCConfiguration({
        clientId: ssoConfig.oidcClientId,
        clientSecret: ssoConfig.oidcClientSecret,
        issuerUrl: ssoConfig.oidcIssuerUrl,
        scopes: ssoConfig.oidcScopes,
        callbackUrl: getOIDCCallbackUrl(org.slug),
      });
    } else {
      return NextResponse.json(
        { error: "Unknown SSO provider" },
        { status: 400 }
      );
    }

    // Update test status
    await prisma.sSOConfig.update({
      where: { organizationId: orgId },
      data: {
        lastTestedAt: new Date(),
        testStatus: testResult.success ? "success" : "failed",
      },
    });

    return NextResponse.json({ testResult });
  } catch (error) {
    console.error("Test SSO config error:", error);
    return NextResponse.json(
      { error: "Failed to test SSO configuration" },
      { status: 500 }
    );
  }
}
