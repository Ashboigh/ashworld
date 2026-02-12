/**
 * OIDC Single Logout (RP-Initiated Logout)
 * Handles logout flow for OIDC providers
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ orgSlug: string }>;
}

/**
 * GET - Initiate logout to OIDC provider
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { orgSlug } = await params;
  const searchParams = request.nextUrl.searchParams;
  const postLogoutRedirectUri =
    searchParams.get("post_logout_redirect_uri") ||
    `${process.env.NEXT_PUBLIC_APP_URL}/`;

  try {
    // Get organization and SSO config
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!org) {
      return NextResponse.redirect(new URL("/logout", request.url));
    }

    const ssoConfig = await prisma.sSOConfig.findUnique({
      where: { organizationId: org.id },
    });

    if (!ssoConfig || ssoConfig.protocol !== "oidc") {
      // No OIDC config, just do local logout
      return NextResponse.redirect(new URL("/api/auth/signout", request.url));
    }

    const config = ssoConfig.config as {
      issuer?: string;
      endSessionEndpoint?: string;
      clientId?: string;
    };

    // Try to get the end_session_endpoint
    let endSessionEndpoint = config.endSessionEndpoint;

    if (!endSessionEndpoint && config.issuer) {
      // Try to discover it from the well-known endpoint
      try {
        const wellKnown = await fetch(
          `${config.issuer}/.well-known/openid-configuration`
        );
        if (wellKnown.ok) {
          const oidcConfig = await wellKnown.json();
          endSessionEndpoint = oidcConfig.end_session_endpoint;
        }
      } catch {
        // Ignore discovery errors
      }
    }

    if (!endSessionEndpoint) {
      // No end_session_endpoint, just do local logout
      const response = NextResponse.redirect(
        new URL(postLogoutRedirectUri, request.url)
      );
      response.cookies.delete("next-auth.session-token");
      response.cookies.delete("__Secure-next-auth.session-token");
      return response;
    }

    // Get id_token_hint from session if available
    const session = await getServerSession(authOptions);
    const idTokenHint = (session as { idToken?: string } | null)?.idToken;

    // Build the logout URL
    const logoutUrl = new URL(endSessionEndpoint);

    if (idTokenHint) {
      logoutUrl.searchParams.set("id_token_hint", idTokenHint);
    }

    if (config.clientId) {
      logoutUrl.searchParams.set("client_id", config.clientId);
    }

    logoutUrl.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);

    // Generate state for security
    const state = crypto.randomUUID();
    logoutUrl.searchParams.set("state", state);

    // Clear local session and redirect to IdP logout
    const response = NextResponse.redirect(logoutUrl);
    response.cookies.delete("next-auth.session-token");
    response.cookies.delete("__Secure-next-auth.session-token");

    return response;
  } catch (error) {
    console.error("OIDC logout error:", error);
    // Fallback to local logout
    const response = NextResponse.redirect(
      new URL("/", request.url)
    );
    response.cookies.delete("next-auth.session-token");
    response.cookies.delete("__Secure-next-auth.session-token");
    return response;
  }
}

/**
 * POST - Handle back-channel logout from IdP
 * https://openid.net/specs/openid-connect-backchannel-1_0.html
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { orgSlug } = await params;

  try {
    const contentType = request.headers.get("content-type");

    let logoutToken: string | null = null;

    if (contentType?.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      logoutToken = formData.get("logout_token") as string | null;
    } else if (contentType?.includes("application/json")) {
      const body = await request.json();
      logoutToken = body.logout_token;
    }

    if (!logoutToken) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Missing logout_token" },
        { status: 400 }
      );
    }

    // Get organization and SSO config
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!org) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Organization not found" },
        { status: 400 }
      );
    }

    const ssoConfig = await prisma.sSOConfig.findUnique({
      where: { organizationId: org.id },
    });

    if (!ssoConfig || ssoConfig.protocol !== "oidc") {
      return NextResponse.json(
        { error: "invalid_request", error_description: "OIDC not configured" },
        { status: 400 }
      );
    }

    // Decode and verify the logout token (JWT)
    // In production, you'd verify the signature using the IdP's JWKS
    const tokenParts = logoutToken.split(".");
    if (tokenParts.length !== 3) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Invalid token format" },
        { status: 400 }
      );
    }

    const payload = JSON.parse(
      Buffer.from(tokenParts[1], "base64url").toString("utf-8")
    );

    // Validate required claims
    if (!payload.sub && !payload.sid) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Missing sub or sid claim" },
        { status: 400 }
      );
    }

    // Find and invalidate sessions
    // In a real implementation, you'd have a session table to invalidate
    // For now, we just log the logout event
    console.log(`Back-channel logout for org ${orgSlug}:`, {
      sub: payload.sub,
      sid: payload.sid,
      events: payload.events,
    });

    // You could also:
    // 1. Store the logout event to prevent token replay
    // 2. Broadcast to other instances to invalidate cached sessions
    // 3. Clear any server-side session stores

    // Return 200 OK with Cache-Control header as per spec
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store",
        "Pragma": "no-cache",
      },
    });
  } catch (error) {
    console.error("OIDC back-channel logout error:", error);
    return NextResponse.json(
      { error: "server_error", error_description: "Logout processing failed" },
      { status: 500 }
    );
  }
}
