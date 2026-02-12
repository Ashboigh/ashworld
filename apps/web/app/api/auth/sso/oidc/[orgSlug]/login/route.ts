import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import {
  generateOIDCAuthUrl,
  getOIDCCallbackUrl,
} from "@/lib/sso";
import {
  getOIDCNonceCookie,
  getOIDCStateCookie,
  getReturnUrlCookie,
  sanitizeRedirectUrl,
} from "@/lib/sso/helpers";

interface RouteParams {
  params: Promise<{ orgSlug: string }>;
}

const DEFAULT_SCOPES = ["openid", "email", "profile"];

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
    return NextResponse.json({ error: "OIDC is not enabled for this organization" }, { status: 404 });
  }

  const requiredFields = [ssoConfig.oidcClientId, ssoConfig.oidcClientSecret, ssoConfig.oidcIssuerUrl];
  if (requiredFields.some((field) => !field)) {
    return NextResponse.json({ error: "Incomplete OIDC configuration" }, { status: 400 });
  }

  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  const redirectUrl = sanitizeRedirectUrl(request.nextUrl.searchParams.get("returnUrl"));

  const scopes = ssoConfig.oidcScopes?.length
    ? ssoConfig.oidcScopes
    : DEFAULT_SCOPES;

  const authUrl = await generateOIDCAuthUrl(
    {
      clientId: ssoConfig.oidcClientId!,
      clientSecret: ssoConfig.oidcClientSecret!,
      issuerUrl: ssoConfig.oidcIssuerUrl!,
      scopes,
      callbackUrl: getOIDCCallbackUrl(orgSlug),
    },
    state,
    nonce
  );

  const response = NextResponse.redirect(authUrl);
  const secure = process.env.NODE_ENV === "production";

  const cookieOptions = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 5,
  };

  response.cookies.set({
    name: getOIDCStateCookie(organization.id),
    value: state,
    ...cookieOptions,
  });

  response.cookies.set({
    name: getOIDCNonceCookie(organization.id),
    value: nonce,
    ...cookieOptions,
  });

  response.cookies.set({
    name: getReturnUrlCookie(organization.id),
    value: redirectUrl,
    ...cookieOptions,
  });

  return response;
}
