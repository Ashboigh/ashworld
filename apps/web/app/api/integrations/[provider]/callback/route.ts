/**
 * OAuth Callback Handler for Third-Party Integrations
 * Handles the OAuth 2.0 authorization code callback
 */

import { NextRequest, NextResponse } from "next/server";
import { handleOAuthCallback } from "@/lib/integrations/oauth-flow";

interface RouteParams {
  params: Promise<{ provider: string }>;
}

/**
 * GET - Handle OAuth callback
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { provider } = await params;
    const searchParams = request.nextUrl.searchParams;

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle OAuth errors
    if (error) {
      console.error(`OAuth error for ${provider}:`, error, errorDescription);
      return NextResponse.redirect(
        new URL(
          `/settings/integrations?error=${encodeURIComponent(
            errorDescription || error
          )}`,
          request.url
        )
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL(
          "/settings/integrations?error=Missing+authorization+code+or+state",
          request.url
        )
      );
    }

    // Handle the callback
    const result = await handleOAuthCallback(code, state);

    if (!result.success) {
      return NextResponse.redirect(
        new URL(
          `/settings/integrations?error=${encodeURIComponent(
            result.error || "OAuth failed"
          )}`,
          request.url
        )
      );
    }

    // Redirect to return URL or integrations page
    const returnUrl = result.returnUrl || "/settings/integrations";
    const successUrl = new URL(returnUrl, request.url);
    successUrl.searchParams.set("connected", provider);

    return NextResponse.redirect(successUrl);
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/settings/integrations?error=Unexpected+error", request.url)
    );
  }
}
