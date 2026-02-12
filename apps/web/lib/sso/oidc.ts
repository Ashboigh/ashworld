import type { OIDCConfig, SSOUserProfile, SSOTestResult } from "./types";

const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

/**
 * OIDC Discovery document structure
 */
interface OIDCDiscovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  grant_types_supported?: string[];
}

/**
 * OIDC Token Response
 */
interface OIDCTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
}

/**
 * Get the OIDC callback URL for an organization
 */
export function getOIDCCallbackUrl(orgSlug: string): string {
  return `${APP_URL}/api/auth/sso/oidc/${orgSlug}/callback`;
}

/**
 * Fetch OIDC discovery document
 */
export async function fetchOIDCDiscovery(issuerUrl: string): Promise<OIDCDiscovery> {
  const discoveryUrl = issuerUrl.endsWith("/")
    ? `${issuerUrl}.well-known/openid-configuration`
    : `${issuerUrl}/.well-known/openid-configuration`;

  const response = await fetch(discoveryUrl, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch OIDC discovery: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Generate OIDC authorization URL
 */
export async function generateOIDCAuthUrl(
  config: OIDCConfig,
  state: string,
  nonce: string
): Promise<string> {
  const discovery = await fetchOIDCDiscovery(config.issuerUrl);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.callbackUrl,
    response_type: "code",
    scope: config.scopes.join(" "),
    state,
    nonce,
  });

  return `${discovery.authorization_endpoint}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeOIDCCode(
  config: OIDCConfig,
  code: string
): Promise<OIDCTokenResponse> {
  const discovery = await fetchOIDCDiscovery(config.issuerUrl);

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.callbackUrl,
  });

  const response = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * Fetch user info from OIDC provider
 */
export async function fetchOIDCUserInfo(
  config: OIDCConfig,
  accessToken: string
): Promise<SSOUserProfile> {
  const discovery = await fetchOIDCDiscovery(config.issuerUrl);

  const response = await fetch(discovery.userinfo_endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.status}`);
  }

  const userInfo = await response.json();

  // Extract user information from OIDC claims
  const email = userInfo.email || userInfo.preferred_username;

  if (!email) {
    throw new Error("No email found in OIDC user info");
  }

  return {
    id: userInfo.sub,
    email: email.toLowerCase(),
    firstName: userInfo.given_name,
    lastName: userInfo.family_name,
    displayName: userInfo.name,
    groups: userInfo.groups,
    rawAttributes: userInfo,
  };
}

/**
 * Complete OIDC authentication flow
 */
export async function authenticateWithOIDC(
  config: OIDCConfig,
  code: string
): Promise<SSOUserProfile> {
  // Exchange code for tokens
  const tokens = await exchangeOIDCCode(config, code);

  // Fetch user info
  const profile = await fetchOIDCUserInfo(config, tokens.access_token);

  return profile;
}

/**
 * Test OIDC configuration
 */
export async function testOIDCConfiguration(config: OIDCConfig): Promise<SSOTestResult> {
  try {
    // Validate issuer URL
    try {
      new URL(config.issuerUrl);
    } catch {
      return {
        success: false,
        message: "Invalid issuer URL",
      };
    }

    // Validate client credentials are present
    if (!config.clientId || !config.clientSecret) {
      return {
        success: false,
        message: "Client ID and Client Secret are required",
      };
    }

    // Try to fetch discovery document
    const discovery = await fetchOIDCDiscovery(config.issuerUrl);

    // Validate required endpoints exist
    if (!discovery.authorization_endpoint || !discovery.token_endpoint) {
      return {
        success: false,
        message: "OIDC discovery document is missing required endpoints",
      };
    }

    return {
      success: true,
      message: "OIDC configuration is valid",
      details: {
        issuer: discovery.issuer,
        authorizationEndpoint: discovery.authorization_endpoint,
        tokenEndpoint: discovery.token_endpoint,
        userInfoEndpoint: discovery.userinfo_endpoint,
        scopesSupported: discovery.scopes_supported,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error validating OIDC config",
    };
  }
}

/**
 * Generate a random state parameter for OIDC flow
 */
export function generateOIDCState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a random nonce for OIDC flow
 */
export function generateOIDCNonce(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}
