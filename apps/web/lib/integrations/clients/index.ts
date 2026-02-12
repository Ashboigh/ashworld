/**
 * Integration API Clients Index
 * Factory for creating integration-specific API clients
 */

export * from "./base";
export * from "./hubspot";
export * from "./salesforce";
export * from "./zendesk";

import { HubSpotClient } from "./hubspot";
import { SalesforceClient } from "./salesforce";
import { ZendeskClient } from "./zendesk";
import { prisma } from "@repo/database";

export type IntegrationClientType = "hubspot" | "salesforce" | "zendesk";

/**
 * Create an integration client based on the integration ID
 */
export async function createIntegrationClient(
  integrationId: string
): Promise<HubSpotClient | SalesforceClient | ZendeskClient | null> {
  // Get integration and credentials
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
    include: {
      credentials: {
        where: { type: "oauth" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!integration || integration.credentials.length === 0) {
    return null;
  }

  const credentialId = integration.credentials[0].id;
  const config = integration.config as Record<string, unknown>;

  switch (integration.provider) {
    case "hubspot":
      return new HubSpotClient(credentialId);

    case "salesforce":
      return new SalesforceClient(credentialId);

    case "zendesk":
      const subdomain = config.subdomain as string;
      if (!subdomain) {
        console.error("Zendesk subdomain not configured");
        return null;
      }
      return new ZendeskClient(credentialId, subdomain);

    default:
      console.error(`Unknown integration provider: ${integration.provider}`);
      return null;
  }
}

/**
 * Get client type for a provider
 */
export function getClientTypeForProvider(provider: string): IntegrationClientType | null {
  const supportedProviders: IntegrationClientType[] = ["hubspot", "salesforce", "zendesk"];
  return supportedProviders.includes(provider as IntegrationClientType)
    ? (provider as IntegrationClientType)
    : null;
}
