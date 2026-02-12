/**
 * SAML 2.0 Single Logout (SLO) Handler
 * Handles logout requests from IdP and initiates SP-initiated logout
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import * as crypto from "crypto";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

interface RouteParams {
  params: Promise<{ orgSlug: string }>;
}

// SAML namespaces
const SAML_PROTOCOL = "urn:oasis:names:tc:SAML:2.0:protocol";
const SAML_ASSERTION = "urn:oasis:names:tc:SAML:2.0:assertion";

/**
 * GET - Handle IdP-initiated logout (redirect binding)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { orgSlug } = await params;
  const searchParams = request.nextUrl.searchParams;

  const samlRequest = searchParams.get("SAMLRequest");
  const relayState = searchParams.get("RelayState");

  if (!samlRequest) {
    return NextResponse.redirect(
      new URL(`/logout?error=missing_saml_request`, request.url)
    );
  }

  try {
    // Get organization and SSO config
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!org) {
      return NextResponse.redirect(
        new URL(`/logout?error=org_not_found`, request.url)
      );
    }

    const ssoConfig = await prisma.sSOConfig.findUnique({
      where: { organizationId: org.id },
    });

    if (!ssoConfig || ssoConfig.protocol !== "saml") {
      return NextResponse.redirect(
        new URL(`/logout?error=sso_not_configured`, request.url)
      );
    }

    // Decode and parse the logout request
    const decoded = Buffer.from(samlRequest, "base64");
    const inflated = await inflateRaw(decoded);
    const logoutRequest = parseLogoutRequest(inflated.toString("utf-8"));

    if (!logoutRequest) {
      return NextResponse.redirect(
        new URL(`/logout?error=invalid_request`, request.url)
      );
    }

    // Invalidate user session
    // In a real implementation, you'd find the session by NameID and invalidate it
    // For now, we'll redirect to our logout endpoint

    // Generate logout response
    const responseId = `_${crypto.randomBytes(16).toString("hex")}`;
    const issueInstant = new Date().toISOString();
    const config = ssoConfig.config as { sloUrl?: string; entityId?: string };
    const sloUrl = config.sloUrl || "";
    const issuer = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/sso/saml/${orgSlug}/metadata`;

    const logoutResponse = buildLogoutResponse(
      responseId,
      logoutRequest.id,
      issueInstant,
      issuer,
      "urn:oasis:names:tc:SAML:2.0:status:Success"
    );

    // Encode and redirect
    const encoded = Buffer.from(
      await deflateRaw(Buffer.from(logoutResponse))
    ).toString("base64");

    const redirectUrl = new URL(sloUrl);
    redirectUrl.searchParams.set("SAMLResponse", encoded);
    if (relayState) {
      redirectUrl.searchParams.set("RelayState", relayState);
    }

    // Clear the session and redirect to IdP
    const response = NextResponse.redirect(redirectUrl);

    // Clear session cookies
    response.cookies.delete("next-auth.session-token");
    response.cookies.delete("__Secure-next-auth.session-token");

    return response;
  } catch (error) {
    console.error("SAML SLO error:", error);
    return NextResponse.redirect(
      new URL(`/logout?error=slo_failed`, request.url)
    );
  }
}

/**
 * POST - Handle IdP-initiated logout (POST binding)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { orgSlug } = await params;

  try {
    const formData = await request.formData();
    const samlRequest = formData.get("SAMLRequest") as string | null;
    const relayState = formData.get("RelayState") as string | null;

    if (!samlRequest) {
      return NextResponse.json(
        { error: "Missing SAMLRequest" },
        { status: 400 }
      );
    }

    // Get organization and SSO config
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const ssoConfig = await prisma.sSOConfig.findUnique({
      where: { organizationId: org.id },
    });

    if (!ssoConfig || ssoConfig.protocol !== "saml") {
      return NextResponse.json(
        { error: "SAML SSO not configured" },
        { status: 400 }
      );
    }

    // Decode the logout request (POST binding uses base64, not deflated)
    const decoded = Buffer.from(samlRequest, "base64").toString("utf-8");
    const logoutRequest = parseLogoutRequest(decoded);

    if (!logoutRequest) {
      return NextResponse.json(
        { error: "Invalid logout request" },
        { status: 400 }
      );
    }

    // Generate logout response
    const responseId = `_${crypto.randomBytes(16).toString("hex")}`;
    const issueInstant = new Date().toISOString();
    const config = ssoConfig.config as { sloUrl?: string };
    const sloUrl = config.sloUrl || "";
    const issuer = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/sso/saml/${orgSlug}/metadata`;

    const logoutResponse = buildLogoutResponse(
      responseId,
      logoutRequest.id,
      issueInstant,
      issuer,
      "urn:oasis:names:tc:SAML:2.0:status:Success"
    );

    // Return auto-submitting form to POST the response
    const encoded = Buffer.from(logoutResponse).toString("base64");

    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Logging out...</title></head>
        <body onload="document.forms[0].submit()">
          <form method="POST" action="${sloUrl}">
            <input type="hidden" name="SAMLResponse" value="${encoded}" />
            ${relayState ? `<input type="hidden" name="RelayState" value="${relayState}" />` : ""}
            <noscript>
              <button type="submit">Continue logout</button>
            </noscript>
          </form>
        </body>
      </html>
    `;

    const response = new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });

    // Clear session cookies
    response.cookies.delete("next-auth.session-token");
    response.cookies.delete("__Secure-next-auth.session-token");

    return response;
  } catch (error) {
    console.error("SAML SLO POST error:", error);
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}

/**
 * Parse SAML LogoutRequest
 */
function parseLogoutRequest(xml: string): { id: string; issuer: string; nameId?: string } | null {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
    const doc = parser.parse(xml);

    // Navigate to LogoutRequest
    const logoutRequest =
      doc["samlp:LogoutRequest"] ||
      doc["saml2p:LogoutRequest"] ||
      doc.LogoutRequest;

    if (!logoutRequest) return null;

    return {
      id: logoutRequest["@_ID"],
      issuer:
        logoutRequest["saml:Issuer"] ||
        logoutRequest["saml2:Issuer"] ||
        logoutRequest.Issuer,
      nameId:
        logoutRequest["saml:NameID"]?.["#text"] ||
        logoutRequest["saml2:NameID"]?.["#text"] ||
        logoutRequest.NameID?.["#text"],
    };
  } catch {
    return null;
  }
}

/**
 * Build SAML LogoutResponse
 */
function buildLogoutResponse(
  id: string,
  inResponseTo: string,
  issueInstant: string,
  issuer: string,
  statusCode: string
): string {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    format: true,
  });

  const response = {
    "samlp:LogoutResponse": {
      "@_xmlns:samlp": SAML_PROTOCOL,
      "@_xmlns:saml": SAML_ASSERTION,
      "@_ID": id,
      "@_Version": "2.0",
      "@_IssueInstant": issueInstant,
      "@_InResponseTo": inResponseTo,
      "saml:Issuer": issuer,
      "samlp:Status": {
        "samlp:StatusCode": {
          "@_Value": statusCode,
        },
      },
    },
  };

  return `<?xml version="1.0" encoding="UTF-8"?>\n${builder.build(response)}`;
}

/**
 * Deflate raw (for redirect binding)
 */
async function deflateRaw(data: Buffer): Promise<Buffer> {
  const { promisify } = await import("util");
  const zlib = await import("zlib");
  const deflateRawAsync = promisify(zlib.deflateRaw);
  return deflateRawAsync(data);
}

/**
 * Inflate raw (for redirect binding)
 */
async function inflateRaw(data: Buffer): Promise<Buffer> {
  const { promisify } = await import("util");
  const zlib = await import("zlib");
  const inflateRawAsync = promisify(zlib.inflateRaw);
  return inflateRawAsync(data);
}
