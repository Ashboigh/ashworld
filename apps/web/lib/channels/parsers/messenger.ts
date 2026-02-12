/**
 * Facebook Messenger Webhook Parser
 * https://developers.facebook.com/docs/messenger-platform/webhooks
 */

import * as crypto from "crypto";
import type {
  ChannelWebhookParser,
  InboundMessage,
  WebhookVerification,
  DeliveryStatus,
} from "../senders/types";

interface MessengerWebhookEntry {
  id: string;
  time: number;
  messaging: MessengerMessagingEvent[];
}

interface MessengerMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: Array<{
      type: "image" | "video" | "audio" | "file" | "location" | "fallback";
      payload: {
        url?: string;
        coordinates?: { lat: number; long: number };
        sticker_id?: number;
      };
    }>;
    quick_reply?: { payload: string };
    reply_to?: { mid: string };
    is_echo?: boolean;
  };
  postback?: {
    title: string;
    payload: string;
    referral?: {
      ref: string;
      source: string;
      type: string;
    };
  };
  referral?: {
    ref: string;
    source: string;
    type: string;
  };
  delivery?: {
    mids: string[];
    watermark: number;
  };
  read?: {
    watermark: number;
  };
  optin?: {
    ref: string;
    user_ref?: string;
    one_time_notif_token?: string;
  };
}

interface MessengerWebhookPayload {
  object: "page";
  entry: MessengerWebhookEntry[];
}

export class MessengerWebhookParser implements ChannelWebhookParser {
  /**
   * Verify webhook signature using HMAC-SHA256
   */
  verifySignature(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): boolean {
    if (!signature || !secret) {
      return false;
    }

    // Signature format: sha256=<hash>
    const signatureParts = signature.split("=");
    if (signatureParts.length !== 2 || signatureParts[0] !== "sha256") {
      return false;
    }

    const providedHash = signatureParts[1];
    const payloadString = typeof payload === "string" ? payload : payload.toString("utf-8");

    const expectedHash = crypto
      .createHmac("sha256", secret)
      .update(payloadString)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(providedHash),
      Buffer.from(expectedHash)
    );
  }

  /**
   * Handle webhook verification challenge
   */
  handleVerification(
    query: Record<string, string>
  ): WebhookVerification {
    const mode = query["hub.mode"];
    const token = query["hub.verify_token"];
    const challenge = query["hub.challenge"];

    // For verification, we just return the challenge
    // The actual token verification should be done by comparing with stored verify token
    if (mode === "subscribe" && challenge) {
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
   * Parse incoming webhook payload to unified message format
   */
  parseInboundMessage(payload: unknown): InboundMessage | null {
    const data = payload as MessengerWebhookPayload;

    if (data.object !== "page" || !data.entry || data.entry.length === 0) {
      return null;
    }

    // Process first messaging event
    for (const entry of data.entry) {
      if (!entry.messaging || entry.messaging.length === 0) {
        continue;
      }

      for (const event of entry.messaging) {
        // Skip echo messages (messages sent by the page itself)
        if (event.message?.is_echo) {
          continue;
        }

        // Handle regular messages
        if (event.message && !event.delivery && !event.read) {
          return this.parseMessageEvent(event);
        }

        // Handle postback (button clicks)
        if (event.postback) {
          return this.parsePostbackEvent(event);
        }

        // Handle referral (m.me links, ads)
        if (event.referral && !event.postback) {
          return this.parseReferralEvent(event);
        }

        // Handle optin (one-time notification, checkbox plugin)
        if (event.optin) {
          return this.parseOptinEvent(event);
        }
      }
    }

    return null;
  }

  /**
   * Check if this is a delivery/read status update
   */
  isDeliveryUpdate(payload: unknown): boolean {
    const data = payload as MessengerWebhookPayload;

    if (data.object !== "page" || !data.entry) {
      return false;
    }

    for (const entry of data.entry) {
      if (!entry.messaging) continue;

      for (const event of entry.messaging) {
        if (event.delivery || event.read) {
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
    const data = payload as MessengerWebhookPayload;

    if (data.object !== "page" || !data.entry) {
      return null;
    }

    for (const entry of data.entry) {
      if (!entry.messaging) continue;

      for (const event of entry.messaging) {
        if (event.delivery && event.delivery.mids && event.delivery.mids.length > 0) {
          return {
            externalId: event.delivery.mids[0],
            status: "delivered",
            timestamp: new Date(event.delivery.watermark),
          };
        }

        if (event.read) {
          // Read receipts don't include message IDs, just watermark
          // We'd need to look up recent messages sent before this watermark
          return {
            externalId: `watermark_${event.read.watermark}`,
            status: "read",
            timestamp: new Date(event.read.watermark),
          };
        }
      }
    }

    return null;
  }

  /**
   * Parse a regular message event
   */
  private parseMessageEvent(event: MessengerMessagingEvent): InboundMessage | null {
    if (!event.message) return null;

    const baseMessage = {
      externalId: event.message.mid,
      senderId: event.sender.id,
      timestamp: new Date(event.timestamp),
      rawPayload: event,
    };

    // Handle quick reply
    if (event.message.quick_reply) {
      return {
        ...baseMessage,
        type: "button_click",
        buttonValue: event.message.quick_reply.payload,
        text: event.message.text,
      };
    }

    // Handle text message
    if (event.message.text && (!event.message.attachments || event.message.attachments.length === 0)) {
      return {
        ...baseMessage,
        type: "text",
        text: event.message.text,
      };
    }

    // Handle attachments
    if (event.message.attachments && event.message.attachments.length > 0) {
      const attachment = event.message.attachments[0];

      // Handle location
      if (attachment.type === "location" && attachment.payload.coordinates) {
        return {
          ...baseMessage,
          type: "location",
          location: {
            latitude: attachment.payload.coordinates.lat,
            longitude: attachment.payload.coordinates.long,
          },
        };
      }

      // Handle media attachments
      if (["image", "video", "audio", "file"].includes(attachment.type)) {
        return {
          ...baseMessage,
          type: "media",
          text: event.message.text,
          media: {
            type: attachment.type === "file" ? "document" : attachment.type as "image" | "video" | "audio",
            url: attachment.payload.url,
          },
        };
      }

      // Handle stickers
      if (attachment.type === "image" && attachment.payload.sticker_id) {
        return {
          ...baseMessage,
          type: "media",
          media: {
            type: "image",
            url: attachment.payload.url,
          },
        };
      }
    }

    // Fallback for text with attachments
    if (event.message.text) {
      return {
        ...baseMessage,
        type: "text",
        text: event.message.text,
      };
    }

    return null;
  }

  /**
   * Parse a postback (button click) event
   */
  private parsePostbackEvent(event: MessengerMessagingEvent): InboundMessage | null {
    if (!event.postback) return null;

    return {
      externalId: `postback_${event.timestamp}`,
      senderId: event.sender.id,
      type: "button_click",
      buttonValue: event.postback.payload,
      text: event.postback.title,
      timestamp: new Date(event.timestamp),
      rawPayload: event,
    };
  }

  /**
   * Parse a referral event (m.me links, ads, etc.)
   */
  private parseReferralEvent(event: MessengerMessagingEvent): InboundMessage | null {
    if (!event.referral) return null;

    return {
      externalId: `referral_${event.timestamp}`,
      senderId: event.sender.id,
      type: "text",
      text: event.referral.ref || "get_started",
      timestamp: new Date(event.timestamp),
      rawPayload: event,
    };
  }

  /**
   * Parse an optin event (one-time notification, checkbox plugin)
   */
  private parseOptinEvent(event: MessengerMessagingEvent): InboundMessage | null {
    if (!event.optin) return null;

    return {
      externalId: `optin_${event.timestamp}`,
      senderId: event.optin.user_ref || event.sender.id,
      type: "text",
      text: event.optin.ref || "optin",
      timestamp: new Date(event.timestamp),
      rawPayload: event,
    };
  }
}

/**
 * Create a Messenger webhook parser
 */
export function createMessengerParser(): MessengerWebhookParser {
  return new MessengerWebhookParser();
}
