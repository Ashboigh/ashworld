import { SAML } from "@node-saml/node-saml";
import type { SAMLConfig, SSOUserProfile, SSOTestResult } from "./types";

const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

/**
 * Create a SAML client for an organization
 */
export function createSAMLClient(config: SAMLConfig): SAML {
  return new SAML({
    entryPoint: config.entryPoint,
    issuer: config.issuer,
    idpCert: config.certificate,
    callbackUrl: config.callbackUrl,
    wantAuthnResponseSigned: true,
    wantAssertionsSigned: true,
    signatureAlgorithm: "sha256",
    digestAlgorithm: "sha256",
  });
}

/**
 * Generate the callback URL for SAML authentication
 */
export function getSAMLCallbackUrl(orgSlug: string): string {
  return `${APP_URL}/api/auth/sso/saml/${orgSlug}/callback`;
}

/**
 * Generate the SAML metadata URL for an organization
 */
export function getSAMLMetadataUrl(orgSlug: string): string {
  return `${APP_URL}/api/auth/sso/saml/${orgSlug}/metadata`;
}

/**
 * Generate SAML metadata XML for the identity provider
 */
export function generateSAMLMetadata(orgSlug: string, _issuer: string): string {
  const callbackUrl = getSAMLCallbackUrl(orgSlug);
  const entityId = `${APP_URL}/saml/${orgSlug}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${entityId}">
  <SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${callbackUrl}" index="0" isDefault="true"/>
  </SPSSODescriptor>
</EntityDescriptor>`;
}

/**
 * Generate SAML authentication request URL
 */
export async function generateSAMLAuthUrl(config: SAMLConfig): Promise<string> {
  const saml = createSAMLClient(config);
  const authUrl = await saml.getAuthorizeUrlAsync("", "", {});
  return authUrl;
}

/**
 * Validate and parse SAML response
 */
export async function validateSAMLResponse(
  config: SAMLConfig,
  samlResponse: string
): Promise<SSOUserProfile> {
  const saml = createSAMLClient(config);

  const { profile } = await saml.validatePostResponseAsync({
    SAMLResponse: samlResponse,
  });

  if (!profile) {
    throw new Error("No profile returned from SAML response");
  }

  // Extract user information from SAML profile
  const email =
    profile.nameID ||
    (profile["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] as string) ||
    (profile.email as string);

  if (!email) {
    throw new Error("No email found in SAML response");
  }

  return {
    id: profile.nameID || email,
    email: email.toLowerCase(),
    firstName:
      (profile["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"] as string) ||
      (profile.firstName as string),
    lastName:
      (profile["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"] as string) ||
      (profile.lastName as string),
    displayName:
      (profile["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] as string) ||
      (profile.displayName as string),
    groups: profile.groups as string[] | undefined,
    rawAttributes: profile as Record<string, unknown>,
  };
}

/**
 * Test SAML configuration
 */
export async function testSAMLConfiguration(config: SAMLConfig): Promise<SSOTestResult> {
  try {
    // Validate certificate format
    if (!config.certificate || config.certificate.trim().length === 0) {
      return {
        success: false,
        message: "Certificate is required",
      };
    }

    // Validate entry point URL
    try {
      new URL(config.entryPoint);
    } catch {
      return {
        success: false,
        message: "Invalid entry point URL",
      };
    }

    // Create SAML client to validate config
    const saml = createSAMLClient(config);

    // Try to generate an auth URL (this validates the basic config)
    await saml.getAuthorizeUrlAsync("", "", {});

    return {
      success: true,
      message: "SAML configuration is valid",
      details: {
        entryPoint: config.entryPoint,
        issuer: config.issuer,
        callbackUrl: config.callbackUrl,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error validating SAML config",
    };
  }
}
