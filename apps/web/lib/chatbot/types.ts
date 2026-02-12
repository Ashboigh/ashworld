import type { Chatbot, Channel, Conversation, Message } from "@repo/database";

// Re-export database types
export type { Chatbot, Channel, Conversation, Message };

// Chatbot status
export type ChatbotStatus = "draft" | "active" | "paused" | "archived";

// AI providers and models
export type AIProvider = "openai" | "anthropic";

export const AI_MODELS = {
  openai: [
    { id: "gpt-4o", name: "GPT-4o", description: "Most capable model" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Fast and affordable" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "High performance" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", description: "Legacy model" },
  ],
  anthropic: [
    { id: "claude-3-opus-20240229", name: "Claude 3 Opus", description: "Most capable" },
    { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet", description: "Balanced" },
    { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", description: "Fast and compact" },
  ],
} as const;

// Persona tones
export const PERSONA_TONES = [
  { id: "professional", name: "Professional", description: "Formal and business-like" },
  { id: "friendly", name: "Friendly", description: "Warm and approachable" },
  { id: "casual", name: "Casual", description: "Relaxed and conversational" },
  { id: "formal", name: "Formal", description: "Highly structured and polite" },
] as const;

export type PersonaTone = (typeof PERSONA_TONES)[number]["id"];

// Channel types
export type ChannelType = "web" | "whatsapp" | "messenger" | "slack" | "telegram" | "teams" | "sms";

export const CHANNEL_TYPES = [
  { id: "web", name: "Web Widget", icon: "Globe", description: "Embed on your website" },
  { id: "whatsapp", name: "WhatsApp", icon: "MessageCircle", description: "WhatsApp Business API" },
  { id: "messenger", name: "Messenger", icon: "Facebook", description: "Facebook Messenger" },
  { id: "slack", name: "Slack", icon: "Slack", description: "Slack workspace integration" },
  { id: "telegram", name: "Telegram", icon: "Send", description: "Telegram bot" },
  { id: "teams", name: "Microsoft Teams", icon: "Server", description: "Teams bot framework" },
  { id: "sms", name: "SMS (Twilio)", icon: "Phone", description: "Twilio SMS channel" },
] as const;

// Conversation status
export type ConversationStatus = "active" | "waiting_for_human" | "handed_off" | "closed";

export const CONVERSATION_STATUSES = [
  { id: "active", name: "Active", color: "green" },
  { id: "waiting_for_human", name: "Waiting for Human", color: "yellow" },
  { id: "handed_off", name: "Handed Off", color: "blue" },
  { id: "closed", name: "Closed", color: "gray" },
] as const;

// Message roles
export type MessageRole = "user" | "assistant" | "system";

// Widget configuration interface
export interface WidgetConfig {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  fontFamily: string;
  borderRadius: number;
  position: "bottom-right" | "bottom-left";
  offsetX: number;
  offsetY: number;
  logoUrl?: string;
  companyName?: string;
  bubbleIcon: "chat" | "message" | "support" | "custom";
  bubbleCustomIcon?: string;
  bubbleSize: number;
  headerTitle: string;
  headerSubtitle?: string;
  showAgentAvatar: boolean;
  agentAvatarUrl?: string;
  autoOpen: boolean;
  autoOpenDelay: number;
  showPoweredBy: boolean;
}

// Default widget configuration
export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  primaryColor: "#6366f1",
  secondaryColor: "#f3f4f6",
  backgroundColor: "#ffffff",
  fontFamily: "Inter, system-ui, sans-serif",
  borderRadius: 12,
  position: "bottom-right",
  offsetX: 20,
  offsetY: 20,
  bubbleIcon: "chat",
  bubbleSize: 60,
  headerTitle: "Chat with us",
  showAgentAvatar: true,
  autoOpen: false,
  autoOpenDelay: 3000,
  showPoweredBy: true,
};

// Chatbot with relations
export interface ChatbotWithStats extends Chatbot {
  _count?: {
    conversations: number;
    channels: number;
  };
  activeConversations?: number;
}

// Conversation with messages
export interface ConversationWithMessages extends Conversation {
  messages: Message[];
  chatbot?: Chatbot;
  channel?: Channel | null;
}

// Message with conversation
export interface MessageWithConversation extends Message {
  conversation?: Conversation;
}

// API response types
export interface ChatStartResponse {
  sessionId: string;
  conversationId: string;
  messages: Array<{
    id: string;
    role: MessageRole;
    content: string;
    buttons?: Array<{ label: string; value: string }>;
    timestamp: number;
  }>;
}

export interface ChatMessageResponse {
  messages: Array<{
    id: string;
    role: MessageRole;
    content: string;
    buttons?: Array<{ label: string; value: string }>;
    citations?: Array<{
      content: string;
      source: string;
    }>;
    timestamp: number;
  }>;
  status: ConversationStatus;
}

// Embed code generation
export function generateEmbedCode(chatbotId: string, baseUrl: string): string {
  return `<script>
  window.chatbotConfig = {
    chatbotId: '${chatbotId}'
  };
</script>
<script src="${baseUrl}/api/embed/${chatbotId}" async></script>`;
}
