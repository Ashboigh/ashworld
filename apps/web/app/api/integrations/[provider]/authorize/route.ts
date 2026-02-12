/**
 * OAuth Authorization Initiation for Third-Party Integrations
 * Redirects user to the provider's OAuth consent page
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateAuthorizationUrl } from "@/lib/integrations/oauth-flow";
import { INTEGRATION_PROVIDERS } from "@/lib/integrations/providers";

interface RouteParams {
  params: Promise<{ provider: string }>;
}

/**
 * GET - Initiate OAuth authorization flow
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { provider: providerId } = await params;
    const searchParams = request.nextUrl.searchParams;

    const workspaceId = searchParams.get("workspaceId");
    const returnUrl = searchParams.get("returnUrl");

    // Require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.redirect(
        new URL(
          `/login?callbackUrl=${encodeURIComponent(request.url)}`,
          request.url
        )
      );
    }

    // Validate workspace ID
    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    // Find the provider
    const provider = INTEGRATION_PROVIDERS.find((p) => p.id === providerId);
    if (!provider) {
      return NextResponse.json(
        { error: "Unknown integration provider" },
        { status: 404 }
      );
    }

    // Check if provider supports OAuth
    if (!provider.oauthConfig) {
      return NextResponse.json(
        { error: "Provider does not support OAuth" },
        { status: 400 }
      );
    }

    // Generate authorization URL
    const authUrl = await generateAuthorizationUrl(
      provider,
      workspaceId,
      session.user.id,
      returnUrl || undefined
    );

    // Redirect to provider's OAuth consent page
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("OAuth authorization error:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth flow" },
      { status: 500 }
    );
  }
}
