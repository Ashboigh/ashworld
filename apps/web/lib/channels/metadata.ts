import type { ChannelType } from "@/lib/chatbot/types";

export interface ChannelProviderMetadata {
  type: ChannelType;
  displayName: string;
  description: string;
  icon: string;
  configFields: Array<{ key: string; label: string; placeholder?: string }>;
  credentialFields: Array<{ key: string; label: string; placeholder?: string }>;
  requiresWebhook: boolean;
}

export const CHANNEL_PROVIDER_METADATA: ChannelProviderMetadata[] = [
  {
    type: "whatsapp",
    displayName: "WhatsApp Business",
    description: "Meta WhatsApp Business API with templated buttons and media support.",
    icon: "MessageCircle",
    configFields: [
      { key: "phoneNumber", label: "Business Phone Number", placeholder: "+1234567890" },
      { key: "metaBusinessId", label: "Facebook Business ID" },
    ],
    credentialFields: [
      { key: "metaAccessToken", label: "Meta Access Token" },
    ],
    requiresWebhook: true,
  },
  {
    type: "messenger",
    displayName: "Facebook Messenger",
    description: "Messenger integration via the Graph API and templates.",
    icon: "Facebook",
    configFields: [
      { key: "pageId", label: "Facebook Page ID" },
    ],
    credentialFields: [
      { key: "pageAccessToken", label: "Page Access Token" },
      { key: "appSecret", label: "App Secret" },
    ],
    requiresWebhook: true,
  },
  {
    type: "slack",
    displayName: "Slack",
    description: "Slack bot token + OAuth workflow with block kit messages.",
    icon: "Slack",
    configFields: [
      { key: "workspaceId", label: "Workspace ID" },
    ],
    credentialFields: [
      { key: "botToken", label: "Bot Token" },
      { key: "signingSecret", label: "Signing Secret" },
    ],
    requiresWebhook: true,
  },
  {
    type: "teams",
    displayName: "Microsoft Teams",
    description: "Bot Framework connector with Adaptive Cards support.",
    icon: "Server",
    configFields: [
      { key: "appId", label: "Azure App ID" },
      { key: "tenantId", label: "Tenant ID" },
    ],
    credentialFields: [
      { key: "appSecret", label: "App Secret" },
    ],
    requiresWebhook: true,
  },
  {
    type: "telegram",
    displayName: "Telegram",
    description: "Bot API with inline keyboards and quick replies.",
    icon: "Send",
    configFields: [
      { key: "botUsername", label: "Bot Username" },
    ],
    credentialFields: [
      { key: "botToken", label: "Bot Token" },
    ],
    requiresWebhook: true,
  },
  {
    type: "sms",
    displayName: "SMS (Twilio)",
    description: "Send SMS via Twilio API with programmable numbers.",
    icon: "Phone",
    configFields: [
      { key: "serviceId", label: "Twilio Service SID" },
    ],
    credentialFields: [
      { key: "accountSid", label: "Account SID" },
      { key: "authToken", label: "Auth Token" },
    ],
    requiresWebhook: true,
  },
  {
    type: "web",
    displayName: "Web Widget",
    description: "Default embeddable widget on your website.",
    icon: "Globe",
    configFields: [],
    credentialFields: [],
    requiresWebhook: false,
  },
];

export const CHANNEL_METADATA_BY_TYPE: Record<ChannelType, ChannelProviderMetadata> =
  CHANNEL_PROVIDER_METADATA.reduce((acc, provider) => {
    acc[provider.type] = provider;
    return acc;
  }, {} as Record<ChannelType, ChannelProviderMetadata>);

export function getChannelMetadata(type: ChannelType) {
  return CHANNEL_METADATA_BY_TYPE[type];
}
