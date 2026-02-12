/**
 * Channel Message Sender Types
 * Unified interfaces for sending messages across all channel types
 */

export interface SendResult {
  success: boolean;
  messageId?: string;
  externalId?: string;
  error?: string;
  errorCode?: string;
  metadata?: Record<string, unknown>;
}

export interface Button {
  label: string;
  value: string;
  type?: "reply" | "url" | "postback";
  url?: string;
}

export interface QuickReply {
  label: string;
  value: string;
}

export interface MediaPayload {
  type: "image" | "video" | "audio" | "document" | "file";
  url?: string;
  data?: Buffer;
  mimeType?: string;
  filename?: string;
  caption?: string;
}

export interface CardPayload {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  buttons?: Button[];
}

export interface RichMessagePayload {
  text?: string;
  buttons?: Button[];
  quickReplies?: QuickReply[];
  media?: MediaPayload;
  cards?: CardPayload[];
}

export interface ChannelCredentials {
  accessToken?: string;
  botToken?: string;
  apiKey?: string;
  apiSecret?: string;
  accountSid?: string;
  authToken?: string;
  phoneNumber?: string;
  pageId?: string;
  appId?: string;
  appSecret?: string;
  webhookSecret?: string;
  [key: string]: string | undefined;
}

export interface ChannelConfig {
  [key: string]: unknown;
}

/**
 * Unified message sender interface
 * All channel senders must implement this interface
 */
export interface ChannelMessageSender {
  /**
   * Send a plain text message
   */
  sendText(recipientId: string, text: string): Promise<SendResult>;

  /**
   * Send a message with buttons
   */
  sendButtons(
    recipientId: string,
    text: string,
    buttons: Button[]
  ): Promise<SendResult>;

  /**
   * Send a message with quick replies
   */
  sendQuickReplies(
    recipientId: string,
    text: string,
    quickReplies: QuickReply[]
  ): Promise<SendResult>;

  /**
   * Send media (image, video, audio, document)
   */
  sendMedia(recipientId: string, media: MediaPayload): Promise<SendResult>;

  /**
   * Send a card or carousel
   */
  sendCards(recipientId: string, cards: CardPayload[]): Promise<SendResult>;

  /**
   * Send a rich message with multiple elements
   */
  sendRichMessage(
    recipientId: string,
    payload: RichMessagePayload
  ): Promise<SendResult>;

  /**
   * Get delivery status of a message
   */
  getDeliveryStatus?(messageId: string): Promise<DeliveryStatus>;
}

export interface DeliveryStatus {
  status: "sent" | "delivered" | "read" | "failed" | "unknown";
  timestamp?: Date;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Parsed inbound message from any channel
 */
export interface InboundMessage {
  externalId: string;
  senderId: string;
  senderName?: string;
  type: "text" | "button_click" | "media" | "location" | "contact" | "unknown";
  text?: string;
  buttonValue?: string;
  media?: {
    type: MediaPayload["type"];
    url?: string;
    mimeType?: string;
    filename?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  timestamp: Date;
  rawPayload: unknown;
}

/**
 * Webhook verification result
 */
export interface WebhookVerification {
  valid: boolean;
  challenge?: string;
  error?: string;
}

/**
 * Channel webhook parser interface
 */
export interface ChannelWebhookParser {
  /**
   * Verify webhook signature
   */
  verifySignature(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): boolean;

  /**
   * Handle webhook verification challenge (GET requests)
   */
  handleVerification?(
    query: Record<string, string>
  ): WebhookVerification;

  /**
   * Parse incoming webhook payload to unified message format
   */
  parseInboundMessage(payload: unknown): InboundMessage | null;

  /**
   * Check if this is a delivery status update
   */
  isDeliveryUpdate?(payload: unknown): boolean;

  /**
   * Parse delivery status update
   */
  parseDeliveryUpdate?(payload: unknown): {
    externalId: string;
    status: DeliveryStatus["status"];
    timestamp?: Date;
    errorCode?: string;
    errorMessage?: string;
  } | null;
}

/**
 * Base class for channel senders with common functionality
 */
export abstract class BaseChannelSender implements ChannelMessageSender {
  protected credentials: ChannelCredentials;
  protected config: ChannelConfig;

  constructor(credentials: ChannelCredentials, config: ChannelConfig = {}) {
    this.credentials = credentials;
    this.config = config;
  }

  abstract sendText(recipientId: string, text: string): Promise<SendResult>;

  abstract sendButtons(
    recipientId: string,
    text: string,
    buttons: Button[]
  ): Promise<SendResult>;

  // Default implementations that can be overridden
  async sendQuickReplies(
    recipientId: string,
    text: string,
    quickReplies: QuickReply[]
  ): Promise<SendResult> {
    // Default: convert quick replies to buttons
    const buttons: Button[] = quickReplies.map((qr) => ({
      label: qr.label,
      value: qr.value,
      type: "reply",
    }));
    return this.sendButtons(recipientId, text, buttons);
  }

  async sendMedia(
    _recipientId: string,
    _media: MediaPayload
  ): Promise<SendResult> {
    return {
      success: false,
      error: "Media sending not supported for this channel",
    };
  }

  async sendCards(
    _recipientId: string,
    _cards: CardPayload[]
  ): Promise<SendResult> {
    return {
      success: false,
      error: "Card sending not supported for this channel",
    };
  }

  async sendRichMessage(
    recipientId: string,
    payload: RichMessagePayload
  ): Promise<SendResult> {
    // Default implementation: send components separately
    const results: SendResult[] = [];

    if (payload.media) {
      results.push(await this.sendMedia(recipientId, payload.media));
    }

    if (payload.cards && payload.cards.length > 0) {
      results.push(await this.sendCards(recipientId, payload.cards));
    }

    if (payload.text && payload.buttons && payload.buttons.length > 0) {
      results.push(
        await this.sendButtons(recipientId, payload.text, payload.buttons)
      );
    } else if (payload.text && payload.quickReplies && payload.quickReplies.length > 0) {
      results.push(
        await this.sendQuickReplies(
          recipientId,
          payload.text,
          payload.quickReplies
        )
      );
    } else if (payload.text) {
      results.push(await this.sendText(recipientId, payload.text));
    }

    // Return first error or success
    const failed = results.find((r) => !r.success);
    if (failed) return failed;

    return results[results.length - 1] || { success: true };
  }

  async getDeliveryStatus(_messageId: string): Promise<DeliveryStatus> {
    return { status: "unknown" };
  }

  /**
   * Helper to make HTTP requests with error handling
   */
  protected async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<{ data?: T; error?: string; status: number }> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      const status = response.status;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          error:
            errorData.error?.message ||
            errorData.message ||
            errorData.description ||
            `HTTP ${status}`,
          status,
        };
      }

      const data = await response.json().catch(() => ({}));
      return { data: data as T, status };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Request failed",
        status: 0,
      };
    }
  }
}
