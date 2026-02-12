/**
 * SSO Provider types
 */
export type SSOProvider = "saml" | "oidc";

/**
 * SAML Configuration
 */
export interface SAMLConfig {
  entryPoint: string;
  issuer: string;
  certificate: string;
  callbackUrl: string;
}

/**
 * OIDC Configuration
 */
export interface OIDCConfig {
  clientId: string;
  clientSecret: string;
  issuerUrl: string;
  scopes: string[];
  callbackUrl: string;
}

/**
 * SSO User Profile from identity provider
 */
export interface SSOUserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  groups?: string[];
  rawAttributes?: Record<string, unknown>;
}

/**
 * SSO Test Result
 */
export interface SSOTestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Known OIDC providers with their discovery URLs
 */
export const OIDC_PROVIDERS = {
  okta: {
    name: "Okta",
    discoveryPattern: "https://{domain}/.well-known/openid-configuration",
  },
  azure: {
    name: "Azure AD",
    discoveryPattern:
      "https://login.microsoftonline.com/{tenantId}/v2.0/.well-known/openid-configuration",
  },
  google: {
    name: "Google Workspace",
    discoveryUrl: "https://accounts.google.com/.well-known/openid-configuration",
  },
  auth0: {
    name: "Auth0",
    discoveryPattern: "https://{domain}/.well-known/openid-configuration",
  },
} as const;

export type OIDCProviderType = keyof typeof OIDC_PROVIDERS;
