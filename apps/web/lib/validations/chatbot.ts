import { z } from "zod";

// Widget configuration schema
export const widgetConfigSchema = z.object({
  // Appearance
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#6366f1"),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#f3f4f6"),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#ffffff"),
  fontFamily: z.string().default("Inter, system-ui, sans-serif"),
  borderRadius: z.number().min(0).max(24).default(12),

  // Position
  position: z.enum(["bottom-right", "bottom-left"]).default("bottom-right"),
  offsetX: z.number().min(0).max(100).default(20),
  offsetY: z.number().min(0).max(100).default(20),

  // Branding
  logoUrl: z.string().url().optional().or(z.literal("")),
  companyName: z.string().max(100).optional(),

  // Bubble
  bubbleIcon: z.enum(["chat", "message", "support", "custom"]).default("chat"),
  bubbleCustomIcon: z.string().url().optional().or(z.literal("")),
  bubbleSize: z.number().min(48).max(80).default(60),

  // Header
  headerTitle: z.string().max(100).default("Chat with us"),
  headerSubtitle: z.string().max(200).optional(),
  showAgentAvatar: z.boolean().default(true),
  agentAvatarUrl: z.string().url().optional().or(z.literal("")),

  // Behavior
  autoOpen: z.boolean().default(false),
  autoOpenDelay: z.number().min(0).max(60000).default(3000),
  showPoweredBy: z.boolean().default(true),
}).partial();

// Create chatbot schema
export const createChatbotSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),

  // Persona
  personaName: z.string().max(50).optional(),
  personaRole: z.string().max(200).optional(),
  personaTone: z.enum(["professional", "friendly", "casual", "formal"]).optional(),
  personaInstructions: z.string().max(5000).optional(),

  // AI Model
  aiProvider: z.enum(["openai", "anthropic"]).default("openai"),
  aiModel: z.string().default("gpt-4o-mini"),
  aiTemperature: z.number().min(0).max(2).default(0.7),
  aiMaxTokens: z.number().min(100).max(8000).default(1000),

  // Behavior
  greetingMessage: z.string().max(1000).optional(),
  fallbackMessage: z.string().max(1000).optional(),
  handoffMessage: z.string().max(1000).optional(),
  enableTypingIndicator: z.boolean().default(true),
  responseDelayMs: z.number().min(0).max(5000).default(0),

  // Widget
  widgetConfig: widgetConfigSchema.optional(),

  // Workflow
  defaultWorkflowId: z.string().cuid().optional().nullable(),
});

// Update chatbot schema
export const updateChatbotSchema = createChatbotSchema.partial().extend({
  status: z.enum(["draft", "active", "paused", "archived"]).optional(),
});

// Channel schemas
export const channelTypeSchema = z.enum([
  "web",
  "whatsapp",
  "messenger",
  "slack",
  "telegram",
  "teams",
  "sms",
]);

export const createChannelSchema = z.object({
  type: channelTypeSchema,
  name: z.string().min(1).max(100),
  config: z.record(z.unknown()).default({}),
  credentials: z.record(z.unknown()).default({}),
});

export const updateChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(["inactive", "active", "error"]).optional(),
  config: z.record(z.unknown()).optional(),
  credentials: z.record(z.unknown()).optional(),
});

// Conversation schemas
export const conversationStatusSchema = z.enum([
  "active",
  "waiting_for_human",
  "handed_off",
  "closed",
]);

export const conversationFiltersSchema = z.object({
  status: conversationStatusSchema.optional(),
  channelId: z.string().cuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Chat API schemas (for public endpoints)
export const startConversationSchema = z.object({
  sessionId: z.string().optional(), // For returning users
  metadata: z.object({
    referrer: z.string().optional(),
    userAgent: z.string().optional(),
    customAttributes: z.record(z.unknown()).optional(),
  }).optional(),
});

export const sendMessageSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  message: z.string().min(1, "Message is required").max(4000),
  buttonValue: z.string().optional(), // For button selections
});

export const messageFeedbackSchema = z.object({
  sessionId: z.string().min(1),
  messageId: z.string().cuid(),
  rating: z.number().min(1).max(5),
  text: z.string().max(1000).optional(),
});

// Human takeover schema
export const takeoverSchema = z.object({
  message: z.string().max(1000).optional(),
});

// Types
export type WidgetConfig = z.infer<typeof widgetConfigSchema>;
export type CreateChatbotInput = z.infer<typeof createChatbotSchema>;
export type UpdateChatbotInput = z.infer<typeof updateChatbotSchema>;
export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;
export type ConversationFilters = z.infer<typeof conversationFiltersSchema>;
export type StartConversationInput = z.infer<typeof startConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type MessageFeedbackInput = z.infer<typeof messageFeedbackSchema>;
export type TakeoverInput = z.infer<typeof takeoverSchema>;
