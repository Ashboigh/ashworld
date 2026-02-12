/**
 * OAuth 2.0 Flow Handler for Third-Party Integrations
 * Handles authorization, token exchange, and token refresh
 */

import { cookies } from "next/headers";
import { prisma } from "@repo/database";
import { encryptCredential, decryptCredential } from "./secure-storage";
import { INTEGRATION_PROVIDERS, type IntegrationProvider } from "./providers";

const OAUTH_STATE_COOKIE = "oauth_state";
const OAUTH_STATE_EXPIRY = 600; // 10 minutes

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
}

interface OAuthState {
  provider: string;
  workspaceId: string;
  userId: string;
  returnUrl?: string;
  timestamp: number;
}

/**
 * Generate OAuth authorization URL for a provider
 */
export async function generateAuthorizationUrl(
  provider: IntegrationProvider,
  workspaceId: string,
  userId: string,
  returnUrl?: string
): Promise<string> {
  const config = getOAuthConfig(provider);
  if (!config) {
    throw new Error(`OAuth not configured for provider: ${provider.id}`);
  }

  // Generate and store state
  const state = generateState({
    provider: provider.id,
    workspaceId,
    userId,
    returnUrl,
    timestamp: Date.now(),
  });

  // Store state in cookie
  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: OAUTH_STATE_EXPIRY,
    path: "/",
  });

  // Build authorization URL based on provider
  const authUrl = new URL(provider.oauthConfig?.authorizationUrl || "");
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);

  if (config.scopes.length > 0) {
    authUrl.searchParams.set("scope", config.scopes.join(" "));
  }

  // Add provider-specific parameters
  if (provider.id === "salesforce") {
    authUrl.searchParams.set("prompt", "consent");
  } else if (provider.id === "hubspot") {
    authUrl.searchParams.set("optional_scope", config.scopes.join(" "));
  } else if (provider.id === "google-calendar") {
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
  }

  return authUrl.toString();
}

/**
 * Handle OAuth callback and exchange code for tokens
 */
export async function handleOAuthCallback(
  code: string,
  state: string
): Promise<{
  success: boolean;
  credentialId?: string;
  returnUrl?: string;
  error?: string;
}> {
  // Verify state
  const cookieStore = await cookies();
  const storedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;

  if (!storedState || storedState !== state) {
    return { success: false, error: "Invalid OAuth state" };
  }

  // Clear the state cookie
  cookieStore.delete(OAUTH_STATE_COOKIE);

  // Decode state
  const stateData = decodeState(state);
  if (!stateData) {
    return { success: false, error: "Failed to decode OAuth state" };
  }

  // Check state hasn't expired (10 minutes)
  if (Date.now() - stateData.timestamp > OAUTH_STATE_EXPIRY * 1000) {
    return { success: false, error: "OAuth state expired" };
  }

  // Find provider
  const provider = INTEGRATION_PROVIDERS.find((p) => p.id === stateData.provider);
  if (!provider) {
    return { success: false, error: "Unknown provider" };
  }

  // Get OAuth config
  const config = getOAuthConfig(provider);
  if (!config) {
    return { success: false, error: "OAuth not configured" };
  }

  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(provider, code, config);
  if (!tokens) {
    return { success: false, error: "Failed to exchange code for tokens" };
  }

  // Store credentials
  const credentialId = await storeCredentials(
    provider,
    stateData.workspaceId,
    stateData.userId,
    tokens
  );

  return {
    success: true,
    credentialId,
    returnUrl: stateData.returnUrl,
  };
}

/**
 * Exchange authorization code for access tokens
 */
async function exchangeCodeForTokens(
  provider: IntegrationProvider,
  code: string,
  config: OAuthConfig
): Promise<TokenResponse | null> {
  const tokenUrl = provider.oauthConfig?.tokenUrl;
  if (!tokenUrl) {
    return null;
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Token exchange failed:", errorData);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Token exchange error:", error);
    return null;
  }
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(
  credentialId: string
): Promise<{
  success: boolean;
  accessToken?: string;
  error?: string;
}> {
  // Get the credential
  const credential = await prisma.integrationCredential.findUnique({
    where: { id: credentialId },
    include: { integration: true },
  });

  if (!credential) {
    return { success: false, error: "Credential not found" };
  }

  // Find provider
  const provider = INTEGRATION_PROVIDERS.find(
    (p) => p.id === credential.integration.provider
  );
  if (!provider || !provider.oauthConfig?.tokenUrl) {
    return { success: false, error: "Provider not found or doesn't support OAuth" };
  }

  // Decrypt credentials
  const encryptedData = credential.encryptedCredentials as { data: string; iv: string };
  const credentials = JSON.parse(decryptCredential(encryptedData.data, encryptedData.iv));

  if (!credentials.refresh_token) {
    return { success: false, error: "No refresh token available" };
  }

  // Get OAuth config
  const config = getOAuthConfig(provider);
  if (!config) {
    return { success: false, error: "OAuth not configured" };
  }

  // Refresh the token
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: credentials.refresh_token,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  try {
    const response = await fetch(provider.oauthConfig.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Token refresh failed:", errorData);
      return { success: false, error: "Token refresh failed" };
    }

    const tokens: TokenResponse = await response.json();

    // Update stored credentials
    const updatedCredentials = {
      ...credentials,
      access_token: tokens.access_token,
      ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
      expires_at: tokens.expires_in
        ? Date.now() + tokens.expires_in * 1000
        : credentials.expires_at,
    };

    const encrypted = encryptCredential(JSON.stringify(updatedCredentials));

    await prisma.integrationCredential.update({
      where: { id: credentialId },
      data: {
        encryptedCredentials: encrypted,
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : credential.expiresAt,
      },
    });

    return { success: true, accessToken: tokens.access_token };
  } catch (error) {
    console.error("Token refresh error:", error);
    return { success: false, error: "Token refresh failed" };
  }
}

/**
 * Get valid access token, refreshing if necessary
 */
export async function getValidAccessToken(
  credentialId: string
): Promise<string | null> {
  const credential = await prisma.integrationCredential.findUnique({
    where: { id: credentialId },
  });

  if (!credential) {
    return null;
  }

  // Decrypt credentials
  const encryptedData = credential.encryptedCredentials as { data: string; iv: string };
  const credentials = JSON.parse(decryptCredential(encryptedData.data, encryptedData.iv));

  // Check if token is expired or about to expire (within 5 minutes)
  const expiresAt = credentials.expires_at || credential.expiresAt?.getTime();
  if (expiresAt && Date.now() > expiresAt - 300000) {
    // Token is expired or expiring soon, refresh it
    const refreshResult = await refreshAccessToken(credentialId);
    if (refreshResult.success && refreshResult.accessToken) {
      return refreshResult.accessToken;
    }
    return null;
  }

  return credentials.access_token;
}

/**
 * Store OAuth credentials in the database
 */
async function storeCredentials(
  provider: IntegrationProvider,
  workspaceId: string,
  userId: string,
  tokens: TokenResponse
): Promise<string> {
  // First, find or create the integration
  let integration = await prisma.integration.findFirst({
    where: {
      workspaceId,
      provider: provider.id,
    },
  });

  if (!integration) {
    integration = await prisma.integration.create({
      data: {
        workspaceId,
        provider: provider.id,
        name: provider.name,
        status: "active",
        config: {},
      },
    });
  }

  // Encrypt credentials
  const credentialData = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_type: tokens.token_type,
    scope: tokens.scope,
    expires_at: tokens.expires_in
      ? Date.now() + tokens.expires_in * 1000
      : undefined,
  };

  const encrypted = encryptCredential(JSON.stringify(credentialData));

  // Store credentials
  const credential = await prisma.integrationCredential.create({
    data: {
      integrationId: integration.id,
      type: "oauth",
      encryptedCredentials: encrypted,
      expiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null,
    },
  });

  return credential.id;
}

/**
 * Get OAuth configuration for a provider from environment variables
 */
function getOAuthConfig(provider: IntegrationProvider): OAuthConfig | null {
  const providerKey = provider.id.toUpperCase().replace(/-/g, "_");

  const clientId = process.env[`${providerKey}_CLIENT_ID`];
  const clientSecret = process.env[`${providerKey}_CLIENT_SECRET`];

  if (!clientId || !clientSecret) {
    return null;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/integrations/${provider.id}/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: provider.oauthConfig?.scopes || [],
  };
}

/**
 * Generate a secure state parameter
 */
function generateState(data: OAuthState): string {
  const jsonData = JSON.stringify(data);
  return Buffer.from(jsonData).toString("base64url");
}

/**
 * Decode a state parameter
 */
function decodeState(state: string): OAuthState | null {
  try {
    const jsonData = Buffer.from(state, "base64url").toString("utf-8");
    return JSON.parse(jsonData);
  } catch {
    return null;
  }
}

/**
 * Revoke OAuth tokens for a credential
 */
export async function revokeOAuthTokens(credentialId: string): Promise<boolean> {
  const credential = await prisma.integrationCredential.findUnique({
    where: { id: credentialId },
    include: { integration: true },
  });

  if (!credential) {
    return false;
  }

  const provider = INTEGRATION_PROVIDERS.find(
    (p) => p.id === credential.integration.provider
  );

  if (!provider?.oauthConfig?.revokeUrl) {
    // No revoke endpoint, just delete the credential
    await prisma.integrationCredential.delete({
      where: { id: credentialId },
    });
    return true;
  }

  // Decrypt credentials
  const encryptedData = credential.encryptedCredentials as { data: string; iv: string };
  const credentials = JSON.parse(decryptCredential(encryptedData.data, encryptedData.iv));

  // Revoke the token
  try {
    await fetch(provider.oauthConfig.revokeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        token: credentials.access_token,
      }),
    });
  } catch (error) {
    console.error("Token revocation error:", error);
    // Continue to delete even if revocation fails
  }

  // Delete the credential
  await prisma.integrationCredential.delete({
    where: { id: credentialId },
  });

  return true;
}
