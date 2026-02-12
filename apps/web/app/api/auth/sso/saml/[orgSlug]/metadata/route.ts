import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { generateSAMLMetadata } from "@/lib/sso";

interface RouteParams {
  params: Promise<{ orgSlug: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
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
    return NextResponse.json({ error: "SAML is not configured for this organization" }, { status: 404 });
  }

  if (!ssoConfig.samlIssuer || !ssoConfig.samlCertificate) {
    return NextResponse.json({ error: "SAML configuration is incomplete" }, { status: 400 });
  }

  const metadata = generateSAMLMetadata(orgSlug, ssoConfig.samlIssuer);

  return new NextResponse(metadata, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "no-cache",
    },
  });
}
