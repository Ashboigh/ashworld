import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import {
  authenticateWithOIDC,
  getOIDCCallbackUrl,
} from "@/lib/sso";
import { ensureSSOUser } from "@/lib/sso/user";
import { issueSSOSession } from "@/lib/auth/sso-session";
import { createAuditLog } from "@/lib/organization";
import {
  getOIDCNonceCookie,
  getOIDCStateCookie,
  getReturnUrlCookie,
  sanitizeRedirectUrl,
  isDomainAllowed,
} from "@/lib/sso/helpers";

const DEFAULT_SCOPES = ["openid", "email", "profile"];

interface RouteParams {
  params: Promise<{ orgSlug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { orgSlug } = await params;

  const organization = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const ssoConfig = await prisma.sSOConfig.findUnique({
    where: { organizationId: organization.id },
  });

  if (!ssoConfig || ssoConfig.provider !== "oidc" || !ssoConfig.enabled) {
    return NextResponse.json({ error: "OIDC is not enabled" }, { status: 404 });
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get(getOIDCStateCookie(organization.id))?.value;

  if (!code || !state || state !== storedState) {
    return NextResponse.json({ error: "Invalid or missing OIDC state" }, { status: 400 });
  }

  const requiredFields = [ssoConfig.oidcClientId, ssoConfig.oidcClientSecret, ssoConfig.oidcIssuerUrl];
  if (requiredFields.some((field) => !field)) {
    return NextResponse.json({ error: "Incomplete OIDC configuration" }, { status: 400 });
  }

  const scopes = ssoConfig.oidcScopes?.length ? ssoConfig.oidcScopes : DEFAULT_SCOPES;

  const profile = await authenticateWithOIDC(
    {
      clientId: ssoConfig.oidcClientId!,
      clientSecret: ssoConfig.oidcClientSecret!,
      issuerUrl: ssoConfig.oidcIssuerUrl!,
      scopes,
      callbackUrl: getOIDCCallbackUrl(orgSlug),
    },
    code
  );

  if (!profile.email) {
    return NextResponse.json({ error: "OIDC profile missing email" }, { status: 400 });
  }

  if (!isDomainAllowed(profile.email, ssoConfig.allowedDomains ?? [])) {
    return NextResponse.json(
      { error: "Email domain is not permitted for this organization" },
      { status: 403 }
    );
  }

  const user = await ensureSSOUser({
    profile,
    organizationId: organization.id,
  });

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      emailVerified: user.emailVerified ?? new Date(),
    },
  });

  await createAuditLog({
    organizationId: organization.id,
    userId: updatedUser.id,
    action: "sso.login",
    resourceType: "user",
    resourceId: updatedUser.id,
  });

  const storedReturn =
    request.cookies.get(getReturnUrlCookie(organization.id))?.value;
  const redirectUrl = sanitizeRedirectUrl(storedReturn);

  const response = await issueSSOSession({
    user: updatedUser,
    provider: "oidc",
    redirectUrl,
    organizationId: organization.id,
    request,
  });

  response.cookies.delete(getReturnUrlCookie(organization.id));
  response.cookies.delete(getOIDCStateCookie(organization.id));
  response.cookies.delete(getOIDCNonceCookie(organization.id));

  return response;
}
