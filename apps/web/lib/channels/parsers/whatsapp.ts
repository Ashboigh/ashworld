/**
 * WhatsApp Cloud API Webhook Parser
 * Parses incoming WhatsApp webhook events to unified message format
 */

import crypto from "crypto";
import type {
  ChannelWebhookParser,
  InboundMessage,
  WebhookVerification,
  DeliveryStatus,
} from "../senders/types";

/**
 * WhatsApp webhook payload structure
 */
interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppEntry[];
}

interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

interface WhatsAppChange {
  value: WhatsAppValue;
  field: string;
}

interface WhatsAppValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
  errors?: WhatsAppError[];
}

interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: {
    body: string;
  };
  image?: WhatsAppMedia;
  video?: WhatsAppMedia;
  audio?: WhatsAppMedia;
  document?: WhatsAppMedia & { filename?: string };
  sticker?: WhatsAppMedia;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  contacts?: Array<{
    name: {
      formatted_name: string;
      first_name?: string;
      last_name?: string;
    };
    phones?: Array<{
      phone: string;
      type?: string;
      wa_id?: string;
    }>;
  }>;
  interactive?: {
    type: string;
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
  button?: {
    text: string;
    payload: string;
  };
  context?: {
    from: string;
    id: string;
  };
  referral?: {
    source_url: string;
    source_type: string;
    source_id: string;
    headline?: string;
    body?: string;
    media_type?: string;
    image_url?: string;
    video_url?: string;
  };
}

interface WhatsAppMedia {
  id: string;
  mime_type: string;
  sha256?: string;
  caption?: string;
}

interface WhatsAppStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    origin?: {
      type: string;
    };
    expiration_timestamp?: string;
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };
  errors?: WhatsAppError[];
}

interface WhatsAppError {
  code: number;
  title: string;
  message?: string;
  error_data?: {
    details: string;
  };
}

export class WhatsAppWebhookParser implements ChannelWebhookParser {
  /**
   * Verify WhatsApp webhook signature using HMAC-SHA256
   */
  verifySignature(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): boolean {
    // WhatsApp sends signature as "sha256=<hash>"
    const expectedSignature = signature.startsWith("sha256=")
      ? signature.slice(7)
      : signature;

    const payloadString =
      typeof payload === "string" ? payload : payload.toString("utf8");

    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payloadString);
    const calculatedSignature = hmac.digest("hex");

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "hex"),
        Buffer.from(calculatedSignature, "hex")
      );
    } catch {
      return false;
    }
  }

  /**
   * Handle webhook verification challenge (GET request)
   * WhatsApp sends a verification challenge when setting up webhooks
   */
  handleVerification(
    query: Record<string, string>
  ): WebhookVerification {
    const mode = query["hub.mode"];
    const token = query["hub.verify_token"];
    const challenge = query["hub.challenge"];

    if (mode === "subscribe" && challenge) {
      // Note: In production, you should verify the token matches your configured verify token
      return {
        valid: true,
        challenge,
      };
    }

    return {
      valid: false,
      error: "Invalid verification request",
    };
  }

  /**
   * Parse incoming WhatsApp webhook payload
   */
  parseInboundMessage(payload: unknown): InboundMessage | null {
    const webhookPayload = payload as WhatsAppWebhookPayload;

    if (webhookPayload.object !== "whatsapp_business_account") {
      return null;
    }

    // Get the first message from the webhook
    for (const entry of webhookPayload.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== "messages") continue;

        const value = change.value;
        const messages = value.messages || [];
        const contacts = value.contacts || [];

        for (const message of messages) {
          // Find contact info
          const contact = contacts.find((c) => c.wa_id === message.from);
          const senderName = contact?.profile?.name || message.from;

          // Parse based on message type
          return this.parseMessage(message, senderName);
        }
      }
    }

    return null;
  }

  /**
   * Parse a single WhatsApp message
   */
  private parseMessage(
    message: WhatsAppMessage,
    senderName: string
  ): InboundMessage | null {
    const baseMessage = {
      externalId: message.id,
      senderId: message.from,
      senderName,
      timestamp: new Date(parseInt(message.timestamp, 10) * 1000),
      rawPayload: message,
    };

    // Text message
    if (message.type === "text" && message.text) {
      return {
        ...baseMessage,
        type: "text",
        text: message.text.body,
      };
    }

    // Interactive button reply
    if (message.type === "interactive" && message.interactive) {
      if (message.interactive.button_reply) {
        return {
          ...baseMessage,
          type: "button_click",
          buttonValue: message.interactive.button_reply.id,
          text: message.interactive.button_reply.title,
        };
      }

      if (message.interactive.list_reply) {
        return {
          ...baseMessage,
          type: "button_click",
          buttonValue: message.interactive.list_reply.id,
          text: message.interactive.list_reply.title,
        };
      }
    }

    // Button message (from templates)
    if (message.type === "button" && message.button) {
      return {
        ...baseMessage,
        type: "button_click",
        buttonValue: message.button.payload,
        text: message.button.text,
      };
    }

    // Image
    if (message.type === "image" && message.image) {
      return {
        ...baseMessage,
        type: "media",
        text: message.image.caption,
        media: {
          type: "image",
          url: message.image.id, // Media ID, needs to be downloaded via API
          mimeType: message.image.mime_type,
        },
      };
    }

    // Video
    if (message.type === "video" && message.video) {
      return {
        ...baseMessage,
        type: "media",
        text: message.video.caption,
        media: {
          type: "video",
          url: message.video.id,
          mimeType: message.video.mime_type,
        },
      };
    }

    // Audio
    if (message.type === "audio" && message.audio) {
      return {
        ...baseMessage,
        type: "media",
        media: {
          type: "audio",
          url: message.audio.id,
          mimeType: message.audio.mime_type,
        },
      };
    }

    // Document
    if (message.type === "document" && message.document) {
      return {
        ...baseMessage,
        type: "media",
        text: message.document.caption,
        media: {
          type: "document",
          url: message.document.id,
          mimeType: message.document.mime_type,
          filename: message.document.filename,
        },
      };
    }

    // Sticker
    if (message.type === "sticker" && message.sticker) {
      return {
        ...baseMessage,
        type: "media",
        media: {
          type: "image",
          url: message.sticker.id,
          mimeType: message.sticker.mime_type,
        },
      };
    }

    // Location
    if (message.type === "location" && message.location) {
      return {
        ...baseMessage,
        type: "location",
        location: {
          latitude: message.location.latitude,
          longitude: message.location.longitude,
          name: message.location.name,
        },
      };
    }

    // Contacts
    if (message.type === "contacts" && message.contacts) {
      const contactInfo = message.contacts
        .map((c) => {
          const phone = c.phones?.[0]?.phone || "No phone";
          return `${c.name.formatted_name}: ${phone}`;
        })
        .join("\n");

      return {
        ...baseMessage,
        type: "contact",
        text: contactInfo,
      };
    }

    // Unknown message type - return as text if possible
    return {
      ...baseMessage,
      type: "unknown",
      text: `Received ${message.type} message`,
    };
  }

  /**
   * Check if this is a delivery status update
   */
  isDeliveryUpdate(payload: unknown): boolean {
    const webhookPayload = payload as WhatsAppWebhookPayload;

    if (webhookPayload.object !== "whatsapp_business_account") {
      return false;
    }

    for (const entry of webhookPayload.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === "messages" && change.value.statuses) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Parse delivery status update
   */
  parseDeliveryUpdate(payload: unknown): {
    externalId: string;
    status: DeliveryStatus["status"];
    timestamp?: Date;
    errorCode?: string;
    errorMessage?: string;
  } | null {
    const webhookPayload = payload as WhatsAppWebhookPayload;

    for (const entry of webhookPayload.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== "messages") continue;

        const statuses = change.value.statuses || [];

        for (const status of statuses) {
          const mappedStatus = this.mapStatus(status.status);

          const result: {
            externalId: string;
            status: DeliveryStatus["status"];
            timestamp?: Date;
            errorCode?: string;
            errorMessage?: string;
          } = {
            externalId: status.id,
            status: mappedStatus,
            timestamp: new Date(parseInt(status.timestamp, 10) * 1000),
          };

          // Include error info if failed
          if (status.status === "failed" && status.errors) {
            const error = status.errors[0];
            result.errorCode = error.code.toString();
            result.errorMessage = error.title || error.message;
          }

          return result;
        }
      }
    }

    return null;
  }

  /**
   * Map WhatsApp status to unified status
   */
  private mapStatus(
    status: "sent" | "delivered" | "read" | "failed"
  ): DeliveryStatus["status"] {
    switch (status) {
      case "sent":
        return "sent";
      case "delivered":
        return "delivered";
      case "read":
        return "read";
      case "failed":
        return "failed";
      default:
        return "unknown";
    }
  }

  /**
   * Check if payload contains errors
   */
  hasErrors(payload: unknown): boolean {
    const webhookPayload = payload as WhatsAppWebhookPayload;

    for (const entry of webhookPayload.entry || []) {
      for (const change of entry.changes || []) {
        if (change.value.errors && change.value.errors.length > 0) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get errors from payload
   */
  getErrors(payload: unknown): WhatsAppError[] {
    const webhookPayload = payload as WhatsAppWebhookPayload;
    const errors: WhatsAppError[] = [];

    for (const entry of webhookPayload.entry || []) {
      for (const change of entry.changes || []) {
        if (change.value.errors) {
          errors.push(...change.value.errors);
        }
      }
    }

    return errors;
  }

  /**
   * Get phone number ID from webhook payload
   */
  getPhoneNumberId(payload: unknown): string | null {
    const webhookPayload = payload as WhatsAppWebhookPayload;

    for (const entry of webhookPayload.entry || []) {
      for (const change of entry.changes || []) {
        if (change.value.metadata?.phone_number_id) {
          return change.value.metadata.phone_number_id;
        }
      }
    }

    return null;
  }
}

/**
 * Create a WhatsApp webhook parser instance
 */
export function createWhatsAppParser(): WhatsAppWebhookParser {
  return new WhatsAppWebhookParser();
}
