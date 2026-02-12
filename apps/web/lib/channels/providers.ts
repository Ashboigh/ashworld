import type { ChannelType } from "@/lib/chatbot/types";
import {
  CHANNEL_METADATA_BY_TYPE,
  ChannelProviderMetadata,
} from "./metadata";

export interface ChannelProvider extends ChannelProviderMetadata {
  type: ChannelType;
  testConnection: (
    config: Record<string, unknown>,
    credentials: Record<string, unknown>
  ) => Promise<{ success: boolean; message: string }>;
  handleWebhook?: (opts: {
    channelId: string;
    payload: Record<string, unknown>;
    headers: Record<string, string | string[] | undefined>;
  }) => Promise<void>;
}

const getStringValue = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (value === undefined || value === null) {
    return null;
  }
  return String(value).trim() || null;
};

const requireFields = (fields: string[], target: Record<string, unknown>) => {
  const missing = fields.filter((field) => !getStringValue(target[field]));
  if (missing.length > 0) {
    return {
      success: false,
      message: `Missing fields: ${missing.join(", ")}`,
    };
  }
  return { success: true, message: "Connection details provided" };
};

const getConfigField = (config: Record<string, unknown>, key: string) => {
  const value = getStringValue(config[key]);
  if (!value) {
    throw new Error(`Missing config value: ${key}`);
  }
  return value;
};

const getCredentialField = (credentials: Record<string, unknown>, key: string) => {
  const value = getStringValue(credentials[key]);
  if (!value) {
    throw new Error(`Missing credential: ${key}`);
  }
  return value;
};

const buildProvider = (
  metadata: ChannelProviderMetadata,
  testFn: (
    config: Record<string, unknown>,
    credentials: Record<string, unknown>
  ) => Promise<{ success: boolean; message: string }>
): ChannelProvider => ({
  ...metadata,
  type: metadata.type,
  testConnection: async (config, credentials) => {
    const credentialCheck = requireFields(metadata.credentialFields, credentials);
    if (!credentialCheck.success) {
      return credentialCheck;
    }

    const configCheck = requireFields(metadata.configFields, config);
    if (!configCheck.success) {
      return configCheck;
    }

    try {
      return await testFn(config, credentials);
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown provider error",
      };
    }
  },
  handleWebhook: async (opts) => {
    console.log(
      `[Channel Webhook] ${metadata.displayName} (${opts.channelId}) payload:`,
      opts.payload
    );
  },
});

const fetchJson = async (url: string, options?: RequestInit) => {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  return { response, body };
};

const testWhatsApp = async (config: Record<string, unknown>, credentials: Record<string, unknown>) => {
  const token = getCredentialField(credentials, "metaAccessToken");
  const businessId = getConfigField(config, "metaBusinessId");
  const url = `https://graph.facebook.com/v18.0/${encodeURIComponent(
    businessId
  )}?fields=name`;

  const { response, body } = await fetchJson(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const message = body.error?.message || "WhatsApp Business authentication failed";
    return { success: false, message };
  }

  return { success: true, message: "WhatsApp Business API credentials look good." };
};

const testMessenger = async (config: Record<string, unknown>, credentials: Record<string, unknown>) => {
  const token = getCredentialField(credentials, "pageAccessToken");
  const pageId = getConfigField(config, "pageId");
  const url = `https://graph.facebook.com/v18.0/${encodeURIComponent(
    pageId
  )}?fields=name`;

  const { response, body } = await fetchJson(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const message = body.error?.message || "Messenger configuration validation failed";
    return { success: false, message };
  }

  return { success: true, message: "Facebook Messenger configuration validated." };
};

const testSlack = async (_config: Record<string, unknown>, credentials: Record<string, unknown>) => {
  const token = getCredentialField(credentials, "botToken");
  const url = "https://slack.com/api/auth.test";

  const { response, body } = await fetchJson(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok || body.ok === false) {
    const message = body.error || "Slack authentication failed";
    return { success: false, message };
  }

  return { success: true, message: "Slack bot token is valid." };
};

const exchangeMicrosoftToken = async (
  tenantId: string,
  clientId: string,
  clientSecret: string
) => {
  const url = `https://login.microsoftonline.com/${encodeURIComponent(
    tenantId
  )}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default",
  });

  const { response, body: json } = await fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const message = json.error_description || json.error || "Token exchange failed";
    throw new Error(message);
  }

  return json.access_token as string;
};

const testTeams = async (config: Record<string, unknown>, credentials: Record<string, unknown>) => {
  const appId = getConfigField(config, "appId");
  const tenantId = getConfigField(config, "tenantId");
  const secret = getCredentialField(credentials, "appSecret");

  const token = await exchangeMicrosoftToken(tenantId, appId, secret);
  const url = `https://graph.microsoft.com/v1.0/applications/${encodeURIComponent(appId)}`;

  const { response, body } = await fetchJson(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const message = body.error?.message || "Microsoft Graph validation failed";
    return { success: false, message };
  }

  return { success: true, message: "Microsoft Teams app configuration looks good." };
};

const testTelegram = async (_config: Record<string, unknown>, credentials: Record<string, unknown>) => {
  const token = getCredentialField(credentials, "botToken");
  const url = `https://api.telegram.org/bot${encodeURIComponent(token)}/getMe`;

  const { response, body } = await fetchJson(url);

  if (!response.ok || body.ok === false) {
    const message = body.description || "Telegram bot validation failed";
    return { success: false, message };
  }

  return { success: true, message: "Telegram bot credentials verified." };
};

const testTwilio = async (_config: Record<string, unknown>, credentials: Record<string, unknown>) => {
  const accountSid = getCredentialField(credentials, "accountSid");
  const authToken = getCredentialField(credentials, "authToken");
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}.json`;

  const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
  const { response, body } = await fetchJson(url, {
    headers: {
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    const message = body.message || "Twilio authentication failed";
    return { success: false, message };
  }

  return { success: true, message: "Twilio credentials are valid." };
};

const providerRegistry: Record<ChannelType, ChannelProvider> = {
  whatsapp: buildProvider(CHANNEL_METADATA_BY_TYPE.whatsapp, testWhatsApp),
  messenger: buildProvider(CHANNEL_METADATA_BY_TYPE.messenger, testMessenger),
  slack: buildProvider(CHANNEL_METADATA_BY_TYPE.slack, testSlack),
  teams: buildProvider(CHANNEL_METADATA_BY_TYPE.teams, testTeams),
  telegram: buildProvider(CHANNEL_METADATA_BY_TYPE.telegram, testTelegram),
  sms: buildProvider(CHANNEL_METADATA_BY_TYPE.sms, testTwilio),
  web: buildProvider(CHANNEL_METADATA_BY_TYPE.web, async () => ({
    success: true,
    message: "Web widget requires no external validation.",
  })),
};

export function getChannelProvider(type: ChannelType): ChannelProvider | null {
  return providerRegistry[type] || null;
}

export function listChannelProviders(): ChannelProvider[] {
  return Object.values(providerRegistry);
}
