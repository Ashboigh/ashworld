import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import {
  generateSAMLAuthUrl,
  getSAMLCallbackUrl,
} from "@/lib/sso";
import { getReturnUrlCookie, sanitizeRedirectUrl } from "@/lib/sso/helpers";

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

  if (!ssoConfig || ssoConfig.provider !== "saml" || !ssoConfig.enabled) {
    return NextResponse.json({ error: "SAML is not enabled for this organization" }, { status: 404 });
  }

  const requiredFields = [ssoConfig.samlEntryPoint, ssoConfig.samlIssuer, ssoConfig.samlCertificate];
  if (requiredFields.some((field) => !field)) {
    return NextResponse.json({ error: "Incomplete SAML configuration" }, { status: 400 });
  }

  const redirectUrl = sanitizeRedirectUrl(request.nextUrl.searchParams.get("returnUrl"));

  const authUrl = await generateSAMLAuthUrl({
    entryPoint: ssoConfig.samlEntryPoint!,
    issuer: ssoConfig.samlIssuer!,
    certificate: ssoConfig.samlCertificate!,
    callbackUrl: getSAMLCallbackUrl(orgSlug),
  });

  const response = NextResponse.redirect(authUrl);
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set({
    name: getReturnUrlCookie(organization.id),
    value: redirectUrl,
    maxAge: 60 * 5,
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
  });

  return response;
}
