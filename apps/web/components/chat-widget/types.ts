export interface WidgetConfig {
  primaryColor: string;
  backgroundColor: string;
  secondaryColor: string;
  position: "bottom-right" | "bottom-left";
  borderRadius: number;
  headerTitle: string;
  headerSubtitle?: string;
  companyName?: string;
  logoUrl?: string;
  bubbleIcon: "chat" | "message" | "support";
  bubbleSize: number;
  autoOpen: boolean;
  autoOpenDelay: number;
  showPoweredBy: boolean;
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  type?: string;
  buttons?: Array<{ label: string; value: string }>;
  timestamp?: Date;
}

export interface ChatbotInfo {
  name: string;
  personaName?: string;
  widgetConfig: WidgetConfig;
}

export interface ChatState {
  sessionId: string | null;
  conversationId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isOpen: boolean;
  chatbot: ChatbotInfo | null;
  error: string | null;
}

export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  primaryColor: "#6366f1",
  backgroundColor: "#ffffff",
  secondaryColor: "#f3f4f6",
  position: "bottom-right",
  borderRadius: 12,
  headerTitle: "Chat with us",
  headerSubtitle: "We typically reply in minutes",
  bubbleIcon: "chat",
  bubbleSize: 60,
  autoOpen: false,
  autoOpenDelay: 5000,
  showPoweredBy: true,
};
