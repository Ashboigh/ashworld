export type IntegrationCategory = "crm" | "helpdesk" | "calendar" | "automation" | "other";

export interface IntegrationAction {
  id: string;
  title: string;
  description: string;
  supportedParams: Array<{
    key: string;
    label: string;
    type: "string" | "number" | "boolean" | "json";
    required?: boolean;
    placeholder?: string;
  }>;
  webhookEvent?: string;
}

export interface OAuthConfig {
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectUri: string;
}

export interface IntegrationProvider {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  icon?: string;
  logoUrl?: string;
  oauth?: OAuthConfig;
  webhookEvents?: string[];
  actions: IntegrationAction[];
}

export interface IntegrationCredentialPayload {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  metadata?: Record<string, unknown>;
}
