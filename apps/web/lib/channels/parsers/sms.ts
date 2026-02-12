/**
 * Twilio SMS/MMS Webhook Parser
 * https://www.twilio.com/docs/messaging/guides/webhook-request
 */

import * as crypto from "crypto";
import type {
  ChannelWebhookParser,
  InboundMessage,
  WebhookVerification,
  DeliveryStatus,
} from "../senders/types";

interface TwilioWebhookPayload {
  MessageSid: string;
  AccountSid: string;
  MessagingServiceSid?: string;
  From: string;
  To: string;
  Body?: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
  MediaUrl1?: string;
  MediaContentType1?: string;
  FromCity?: string;
  FromState?: string;
  FromZip?: string;
  FromCountry?: string;
  ToCity?: string;
  ToState?: string;
  ToZip?: string;
  ToCountry?: string;
}

interface TwilioStatusCallback {
  MessageSid: string;
  MessageStatus: string;
  AccountSid: string;
  From: string;
  To: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

export class SMSWebhookParser implements ChannelWebhookParser {
  /**
   * Verify Twilio webhook signature
   * https://www.twilio.com/docs/usage/security#validating-requests
   */
  verifySignature(
    payload: string | Buffer,
    signature: string,
    authToken: string
  ): boolean {
    if (!signature || !authToken) {
      return false;
    }

    // Twilio signature validation requires the full URL
    // The payload here is typically the URL + sorted POST parameters
    const payloadString = typeof payload === "string" ? payload : payload.toString("utf-8");

    const expectedSignature = crypto
      .createHmac("sha1", authToken)
      .update(payloadString)
      .digest("base64");

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      return false;
    }
  }

  /**
   * Verify with URL (proper Twilio validation)
   */
  verifySignatureWithUrl(
    url: string,
    params: Record<string, string>,
    signature: string,
    authToken: string
  ): boolean {
    if (!signature || !authToken) {
      return false;
    }

    // Sort params alphabetically and append to URL
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], "");

    const data = url + sortedParams;

    const expectedSignature = crypto
      .createHmac("sha1", authToken)
      .update(data)
      .digest("base64");

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      return false;
    }
  }

  /**
   * Twilio doesn't use verification challenges
   */
  handleVerification(
    _query: Record<string, string>
  ): WebhookVerification {
    return { valid: true };
  }

  /**
   * Parse incoming SMS/MMS webhook to unified message format
   */
  parseInboundMessage(payload: unknown): InboundMessage | null {
    const data = payload as TwilioWebhookPayload;

    // Check if this is an inbound message (has From and Body or Media)
    if (!data.MessageSid || !data.From) {
      return null;
    }

    // Skip status callbacks (they don't have Body or media)
    if (!data.Body && !data.NumMedia) {
      return null;
    }

    const baseMessage = {
      externalId: data.MessageSid,
      senderId: data.From,
      timestamp: new Date(),
      rawPayload: data,
    };

    // Check for MMS attachments
    const numMedia = parseInt(data.NumMedia || "0", 10);
    if (numMedia > 0 && data.MediaUrl0) {
      return {
        ...baseMessage,
        type: "media",
        text: data.Body,
        media: {
          type: this.getMediaType(data.MediaContentType0 || ""),
          url: data.MediaUrl0,
          mimeType: data.MediaContentType0,
        },
      };
    }

    // Regular text message
    if (data.Body) {
      return {
        ...baseMessage,
        type: "text",
        text: data.Body,
      };
    }

    return null;
  }

  /**
   * Check if this is a delivery status callback
   */
  isDeliveryUpdate(payload: unknown): boolean {
    const data = payload as TwilioStatusCallback;
    return !!(data.MessageSid && data.MessageStatus && !("Body" in data));
  }

  /**
   * Parse delivery status callback
   */
  parseDeliveryUpdate(payload: unknown): {
    externalId: string;
    status: DeliveryStatus["status"];
    timestamp?: Date;
    errorCode?: string;
    errorMessage?: string;
  } | null {
    const data = payload as TwilioStatusCallback;

    if (!data.MessageSid || !data.MessageStatus) {
      return null;
    }

    return {
      externalId: data.MessageSid,
      status: this.mapTwilioStatus(data.MessageStatus),
      timestamp: new Date(),
      errorCode: data.ErrorCode,
      errorMessage: data.ErrorMessage,
    };
  }

  /**
   * Get the sender's phone number (normalized)
   */
  getSenderNumber(payload: unknown): string | null {
    const data = payload as TwilioWebhookPayload;
    return data.From || null;
  }

  /**
   * Get recipient phone number
   */
  getRecipientNumber(payload: unknown): string | null {
    const data = payload as TwilioWebhookPayload;
    return data.To || null;
  }

  /**
   * Get sender location info if available
   */
  getSenderLocation(payload: unknown): {
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  } | null {
    const data = payload as TwilioWebhookPayload;

    if (!data.FromCity && !data.FromState && !data.FromCountry) {
      return null;
    }

    return {
      city: data.FromCity,
      state: data.FromState,
      zip: data.FromZip,
      country: data.FromCountry,
    };
  }

  /**
   * Get all media URLs from MMS
   */
  getMediaUrls(payload: unknown): Array<{
    url: string;
    contentType: string;
  }> {
    const data = payload as TwilioWebhookPayload;
    const media: Array<{ url: string; contentType: string }> = [];
    const numMedia = parseInt(data.NumMedia || "0", 10);

    for (let i = 0; i < numMedia; i++) {
      const urlKey = `MediaUrl${i}` as keyof TwilioWebhookPayload;
      const typeKey = `MediaContentType${i}` as keyof TwilioWebhookPayload;

      const url = data[urlKey];
      const contentType = data[typeKey];

      if (url && typeof url === "string") {
        media.push({
          url,
          contentType: (contentType as string) || "application/octet-stream",
        });
      }
    }

    return media;
  }

  /**
   * Generate TwiML response for auto-reply
   */
  generateTwiMLResponse(message?: string): string {
    if (!message) {
      return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
    }

    // Escape XML special characters
    const escapedMessage = message
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

    return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapedMessage}</Message></Response>`;
  }

  /**
   * Map Twilio status to our DeliveryStatus
   */
  private mapTwilioStatus(status: string): DeliveryStatus["status"] {
    switch (status.toLowerCase()) {
      case "queued":
      case "sending":
      case "sent":
        return "sent";
      case "delivered":
        return "delivered";
      case "read":
        return "read";
      case "failed":
      case "undelivered":
        return "failed";
      default:
        return "unknown";
    }
  }

  /**
   * Convert MIME type to our media type
   */
  private getMediaType(
    mimeType: string
  ): "image" | "video" | "audio" | "document" {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    return "document";
  }
}

/**
 * Create an SMS webhook parser
 */
export function createSMSParser(): SMSWebhookParser {
  return new SMSWebhookParser();
}
