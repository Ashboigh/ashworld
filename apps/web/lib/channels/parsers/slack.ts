/**
 * Slack Events API Webhook Parser
 * https://api.slack.com/events-api
 */

import * as crypto from "crypto";
import type {
  ChannelWebhookParser,
  InboundMessage,
  WebhookVerification,
  DeliveryStatus,
} from "../senders/types";

interface SlackEventWrapper {
  token?: string;
  team_id?: string;
  api_app_id?: string;
  event?: SlackEvent;
  type: "event_callback" | "url_verification";
  event_id?: string;
  event_time?: number;
  challenge?: string;
}

interface SlackEvent {
  type: string;
  user?: string;
  channel?: string;
  text?: string;
  ts?: string;
  thread_ts?: string;
  bot_id?: string;
  subtype?: string;
  files?: SlackFile[];
  attachments?: SlackAttachment[];
  blocks?: SlackBlock[];
}

interface SlackFile {
  id: string;
  name: string;
  filetype: string;
  mimetype: string;
  url_private?: string;
  url_private_download?: string;
  thumb_360?: string;
  thumb_480?: string;
}

interface SlackAttachment {
  fallback?: string;
  text?: string;
  pretext?: string;
  title?: string;
  title_link?: string;
  image_url?: string;
}

interface SlackBlock {
  type: string;
  block_id?: string;
  text?: {
    type: string;
    text: string;
  };
  elements?: SlackBlockElement[];
}

interface SlackBlockElement {
  type: string;
  action_id?: string;
  value?: string;
  text?: {
    type: string;
    text: string;
  };
}

interface SlackInteractionPayload {
  type: "block_actions" | "shortcut" | "message_action" | "view_submission";
  user: {
    id: string;
    username?: string;
    name?: string;
  };
  container?: {
    type: string;
    message_ts?: string;
    channel_id?: string;
  };
  channel?: {
    id: string;
    name?: string;
  };
  message?: {
    ts: string;
    text?: string;
  };
  actions?: SlackAction[];
  trigger_id?: string;
  response_url?: string;
}

interface SlackAction {
  action_id: string;
  block_id?: string;
  type: string;
  value?: string;
  selected_option?: {
    value: string;
    text?: { text: string };
  };
  action_ts: string;
}

export class SlackWebhookParser implements ChannelWebhookParser {
  /**
   * Verify webhook signature using HMAC-SHA256
   * Slack uses: v0=HMAC-SHA256(signing_secret, "v0:timestamp:body")
   */
  verifySignature(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): boolean {
    if (!signature || !secret) {
      return false;
    }

    // Extract timestamp from X-Slack-Request-Timestamp header
    // This should be passed along with the signature
    // For now, we'll extract it from the signature if it contains it
    // Format: v0=hash
    const signatureParts = signature.split("=");
    if (signatureParts.length !== 2 || signatureParts[0] !== "v0") {
      return false;
    }

    const providedHash = signatureParts[1];
    const payloadString = typeof payload === "string" ? payload : payload.toString("utf-8");

    // Note: In production, you'd need to include the timestamp in the signature base
    // This is a simplified version - the full implementation would need access to headers
    const expectedHash = crypto
      .createHmac("sha256", secret)
      .update(`v0:${payloadString}`)
      .digest("hex");

    try {
      return crypto.timingSafeEqual(
        Buffer.from(providedHash),
        Buffer.from(expectedHash)
      );
    } catch {
      return false;
    }
  }

  /**
   * Verify signature with timestamp (full implementation)
   */
  verifySignatureWithTimestamp(
    payload: string,
    signature: string,
    timestamp: string,
    secret: string
  ): boolean {
    if (!signature || !secret || !timestamp) {
      return false;
    }

    // Check timestamp is not too old (5 minutes)
    const currentTime = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp, 10);
    if (Math.abs(currentTime - requestTime) > 300) {
      return false;
    }

    const signatureParts = signature.split("=");
    if (signatureParts.length !== 2 || signatureParts[0] !== "v0") {
      return false;
    }

    const providedHash = signatureParts[1];
    const sigBaseString = `v0:${timestamp}:${payload}`;

    const expectedHash = crypto
      .createHmac("sha256", secret)
      .update(sigBaseString)
      .digest("hex");

    try {
      return crypto.timingSafeEqual(
        Buffer.from(providedHash),
        Buffer.from(expectedHash)
      );
    } catch {
      return false;
    }
  }

  /**
   * Handle URL verification challenge
   */
  handleVerification(
    query: Record<string, string>
  ): WebhookVerification {
    // Slack sends challenge in POST body, not query params
    // This is called for the url_verification event type
    return {
      valid: true,
    };
  }

  /**
   * Check if this is a URL verification request
   */
  isUrlVerification(payload: unknown): boolean {
    const data = payload as SlackEventWrapper;
    return data.type === "url_verification" && !!data.challenge;
  }

  /**
   * Get the challenge from URL verification request
   */
  getChallenge(payload: unknown): string | null {
    const data = payload as SlackEventWrapper;
    return data.challenge || null;
  }

  /**
   * Parse incoming webhook payload to unified message format
   */
  parseInboundMessage(payload: unknown): InboundMessage | null {
    // Handle Events API payload
    if (this.isEventPayload(payload)) {
      return this.parseEventPayload(payload as SlackEventWrapper);
    }

    // Handle Interactive Components payload
    if (this.isInteractionPayload(payload)) {
      return this.parseInteractionPayload(payload as SlackInteractionPayload);
    }

    return null;
  }

  /**
   * Check if this is a delivery update (Slack doesn't have explicit delivery updates)
   */
  isDeliveryUpdate(_payload: unknown): boolean {
    return false;
  }

  /**
   * Parse delivery status update (not supported by Slack)
   */
  parseDeliveryUpdate(_payload: unknown): {
    externalId: string;
    status: DeliveryStatus["status"];
    timestamp?: Date;
  } | null {
    return null;
  }

  /**
   * Check if payload is an Events API event
   */
  private isEventPayload(payload: unknown): boolean {
    const data = payload as SlackEventWrapper;
    return data.type === "event_callback" && !!data.event;
  }

  /**
   * Check if payload is an Interactive Components event
   */
  private isInteractionPayload(payload: unknown): boolean {
    const data = payload as SlackInteractionPayload;
    return ["block_actions", "shortcut", "message_action", "view_submission"].includes(
      data.type
    );
  }

  /**
   * Parse Events API payload
   */
  private parseEventPayload(wrapper: SlackEventWrapper): InboundMessage | null {
    const event = wrapper.event;
    if (!event) return null;

    // Ignore bot messages to prevent loops
    if (event.bot_id || event.subtype === "bot_message") {
      return null;
    }

    // Ignore message subtypes like channel_join, etc.
    if (event.subtype && event.subtype !== "file_share") {
      return null;
    }

    const baseMessage = {
      externalId: event.ts || `${wrapper.event_id || Date.now()}`,
      senderId: event.user || "unknown",
      timestamp: new Date(
        event.ts
          ? parseFloat(event.ts) * 1000
          : (wrapper.event_time || 0) * 1000
      ),
      rawPayload: wrapper,
    };

    // Handle regular messages
    if (event.type === "message" && event.text) {
      // Check for file attachments
      if (event.files && event.files.length > 0) {
        const file = event.files[0];
        return {
          ...baseMessage,
          type: "media",
          text: event.text,
          media: {
            type: this.getFileType(file.mimetype),
            url: file.url_private_download || file.url_private,
            mimeType: file.mimetype,
            filename: file.name,
          },
        };
      }

      return {
        ...baseMessage,
        type: "text",
        text: event.text,
      };
    }

    // Handle app_mention (when bot is @mentioned)
    if (event.type === "app_mention" && event.text) {
      // Remove the mention from the text
      const text = event.text.replace(/<@[A-Z0-9]+>/g, "").trim();
      return {
        ...baseMessage,
        type: "text",
        text: text || event.text,
      };
    }

    return null;
  }

  /**
   * Parse Interactive Components payload (button clicks, etc.)
   */
  private parseInteractionPayload(
    payload: SlackInteractionPayload
  ): InboundMessage | null {
    if (payload.type === "block_actions" && payload.actions && payload.actions.length > 0) {
      const action = payload.actions[0];
      const channelId = payload.channel?.id || payload.container?.channel_id || "unknown";

      return {
        externalId: `${payload.container?.message_ts || Date.now()}_${action.action_ts}`,
        senderId: payload.user.id,
        senderName: payload.user.name || payload.user.username,
        type: "button_click",
        buttonValue: action.value || action.selected_option?.value || action.action_id,
        text: action.selected_option?.text?.text,
        timestamp: new Date(parseFloat(action.action_ts) * 1000),
        rawPayload: payload,
      };
    }

    return null;
  }

  /**
   * Convert MIME type to our media type
   */
  private getFileType(
    mimeType: string
  ): "image" | "video" | "audio" | "document" {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    return "document";
  }

  /**
   * Get the channel/DM ID from the event
   */
  getChannelId(payload: unknown): string | null {
    const eventWrapper = payload as SlackEventWrapper;
    if (eventWrapper.event?.channel) {
      return eventWrapper.event.channel;
    }

    const interaction = payload as SlackInteractionPayload;
    return interaction.channel?.id || interaction.container?.channel_id || null;
  }

  /**
   * Get the response URL for interactive messages
   */
  getResponseUrl(payload: unknown): string | null {
    const interaction = payload as SlackInteractionPayload;
    return interaction.response_url || null;
  }
}

/**
 * Create a Slack webhook parser
 */
export function createSlackParser(): SlackWebhookParser {
  return new SlackWebhookParser();
}
