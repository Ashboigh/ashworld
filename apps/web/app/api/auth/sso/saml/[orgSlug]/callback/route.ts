import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { validateSAMLResponse, getSAMLCallbackUrl } from "@/lib/sso";
import { ensureSSOUser } from "@/lib/sso/user";
import { issueSSOSession } from "@/lib/auth/sso-session";
import { createAuditLog } from "@/lib/organization";
import {
  getReturnUrlCookie,
  sanitizeRedirectUrl,
  isDomainAllowed,
} from "@/lib/sso/helpers";

interface RouteParams {
  params: Promise<{ orgSlug: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
    return NextResponse.json({ error: "SAML is not enabled" }, { status: 404 });
  }

  const requiredFields = [ssoConfig.samlEntryPoint, ssoConfig.samlIssuer, ssoConfig.samlCertificate];
  if (requiredFields.some((field) => !field)) {
    return NextResponse.json({ error: "Incomplete SAML configuration" }, { status: 400 });
  }

  const form = await request.formData();
  const samlResponse = form.get("SAMLResponse");

  if (!samlResponse || typeof samlResponse !== "string") {
    return NextResponse.json({ error: "Missing SAML response" }, { status: 400 });
  }

  const profile = await validateSAMLResponse(
    {
      entryPoint: ssoConfig.samlEntryPoint!,
      issuer: ssoConfig.samlIssuer!,
      certificate: ssoConfig.samlCertificate!,
      callbackUrl: getSAMLCallbackUrl(orgSlug),
    },
    samlResponse
  );

  if (!profile.email) {
    return NextResponse.json({ error: "SSO profile missing email" }, { status: 400 });
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

  const relayState =
    typeof form.get("RelayState") === "string"
      ? sanitizeRedirectUrl(form.get("RelayState") as string)
      : undefined;
  const storedReturn =
    request.cookies.get(getReturnUrlCookie(organization.id))?.value;
  const redirectUrl = relayState ?? sanitizeRedirectUrl(storedReturn);

  const response = await issueSSOSession({
    user: updatedUser,
    provider: "saml",
    redirectUrl,
    organizationId: organization.id,
    request,
  });

  response.cookies.delete(getReturnUrlCookie(organization.id));

  return response;
}
