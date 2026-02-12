/**
 * Telegram Webhook Parser
 * Parses incoming Telegram webhook events to unified message format
 */

import crypto from "crypto";
import type {
  ChannelWebhookParser,
  InboundMessage,
  WebhookVerification,
} from "../senders/types";

/**
 * Telegram Update object structure
 */
interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
  edited_message?: TelegramMessage;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  photo?: TelegramPhotoSize[];
  video?: TelegramVideo;
  audio?: TelegramAudio;
  document?: TelegramDocument;
  voice?: TelegramVoice;
  location?: TelegramLocation;
  contact?: TelegramContact;
  caption?: string;
  reply_to_message?: TelegramMessage;
}

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  chat_instance: string;
  data?: string;
}

interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

interface TelegramVideo {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

interface TelegramAudio {
  file_id: string;
  file_unique_id: string;
  duration: number;
  performer?: string;
  title?: string;
  mime_type?: string;
  file_size?: number;
}

interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

interface TelegramVoice {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

interface TelegramLocation {
  longitude: number;
  latitude: number;
}

interface TelegramContact {
  phone_number: string;
  first_name: string;
  last_name?: string;
  user_id?: number;
}

export class TelegramWebhookParser implements ChannelWebhookParser {
  /**
   * Verify Telegram webhook signature
   * Telegram uses X-Telegram-Bot-Api-Secret-Token header
   */
  verifySignature(
    _payload: string | Buffer,
    signature: string,
    secret: string
  ): boolean {
    // Telegram sends the secret token directly in the header
    // We just need to compare it
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(secret)
    );
  }

  /**
   * Telegram doesn't use GET verification challenges
   * Webhook is set via API call with setWebhook
   */
  handleVerification(
    _query: Record<string, string>
  ): WebhookVerification {
    return { valid: true };
  }

  /**
   * Parse incoming Telegram webhook payload
   */
  parseInboundMessage(payload: unknown): InboundMessage | null {
    const update = payload as TelegramUpdate;

    // Handle callback query (button click)
    if (update.callback_query) {
      return this.parseCallbackQuery(update.callback_query);
    }

    // Handle regular message
    if (update.message) {
      return this.parseMessage(update.message);
    }

    // Handle edited message (optional)
    if (update.edited_message) {
      return this.parseMessage(update.edited_message);
    }

    return null;
  }

  /**
   * Parse a regular message
   */
  private parseMessage(message: TelegramMessage): InboundMessage | null {
    const senderId = message.chat.id.toString();
    const senderName = this.formatSenderName(message.from, message.chat);

    // Text message
    if (message.text) {
      return {
        externalId: `${message.chat.id}_${message.message_id}`,
        senderId,
        senderName,
        type: "text",
        text: message.text,
        timestamp: new Date(message.date * 1000),
        rawPayload: message,
      };
    }

    // Photo
    if (message.photo && message.photo.length > 0) {
      // Get the largest photo
      const photo = message.photo[message.photo.length - 1];
      return {
        externalId: `${message.chat.id}_${message.message_id}`,
        senderId,
        senderName,
        type: "media",
        text: message.caption,
        media: {
          type: "image",
          url: photo.file_id, // Will need to be resolved via getFile API
          mimeType: "image/jpeg",
        },
        timestamp: new Date(message.date * 1000),
        rawPayload: message,
      };
    }

    // Video
    if (message.video) {
      return {
        externalId: `${message.chat.id}_${message.message_id}`,
        senderId,
        senderName,
        type: "media",
        text: message.caption,
        media: {
          type: "video",
          url: message.video.file_id,
          mimeType: message.video.mime_type,
        },
        timestamp: new Date(message.date * 1000),
        rawPayload: message,
      };
    }

    // Audio
    if (message.audio) {
      return {
        externalId: `${message.chat.id}_${message.message_id}`,
        senderId,
        senderName,
        type: "media",
        text: message.caption,
        media: {
          type: "audio",
          url: message.audio.file_id,
          mimeType: message.audio.mime_type,
          filename: message.audio.title,
        },
        timestamp: new Date(message.date * 1000),
        rawPayload: message,
      };
    }

    // Voice
    if (message.voice) {
      return {
        externalId: `${message.chat.id}_${message.message_id}`,
        senderId,
        senderName,
        type: "media",
        media: {
          type: "audio",
          url: message.voice.file_id,
          mimeType: message.voice.mime_type || "audio/ogg",
        },
        timestamp: new Date(message.date * 1000),
        rawPayload: message,
      };
    }

    // Document
    if (message.document) {
      return {
        externalId: `${message.chat.id}_${message.message_id}`,
        senderId,
        senderName,
        type: "media",
        text: message.caption,
        media: {
          type: "document",
          url: message.document.file_id,
          mimeType: message.document.mime_type,
          filename: message.document.file_name,
        },
        timestamp: new Date(message.date * 1000),
        rawPayload: message,
      };
    }

    // Location
    if (message.location) {
      return {
        externalId: `${message.chat.id}_${message.message_id}`,
        senderId,
        senderName,
        type: "location",
        location: {
          latitude: message.location.latitude,
          longitude: message.location.longitude,
        },
        timestamp: new Date(message.date * 1000),
        rawPayload: message,
      };
    }

    // Contact
    if (message.contact) {
      return {
        externalId: `${message.chat.id}_${message.message_id}`,
        senderId,
        senderName,
        type: "contact",
        text: `Contact: ${message.contact.first_name} ${message.contact.last_name || ""} - ${message.contact.phone_number}`,
        timestamp: new Date(message.date * 1000),
        rawPayload: message,
      };
    }

    // Unknown message type
    return null;
  }

  /**
   * Parse a callback query (button click)
   */
  private parseCallbackQuery(
    callbackQuery: TelegramCallbackQuery
  ): InboundMessage | null {
    const chatId = callbackQuery.message?.chat.id;
    if (!chatId) return null;

    const senderId = chatId.toString();
    const senderName = this.formatSenderName(
      callbackQuery.from,
      callbackQuery.message?.chat
    );

    return {
      externalId: callbackQuery.id,
      senderId,
      senderName,
      type: "button_click",
      buttonValue: callbackQuery.data,
      text: callbackQuery.data, // Also set as text for workflow compatibility
      timestamp: new Date(),
      rawPayload: callbackQuery,
    };
  }

  /**
   * Format sender name from user/chat info
   */
  private formatSenderName(
    user?: TelegramUser,
    chat?: TelegramChat
  ): string {
    if (user) {
      const parts = [user.first_name];
      if (user.last_name) parts.push(user.last_name);
      return parts.join(" ");
    }

    if (chat) {
      if (chat.title) return chat.title;
      if (chat.first_name) {
        const parts = [chat.first_name];
        if (chat.last_name) parts.push(chat.last_name);
        return parts.join(" ");
      }
    }

    return "Unknown";
  }

  /**
   * Check if this is a delivery status update
   * Telegram doesn't send delivery receipts via webhook
   */
  isDeliveryUpdate(_payload: unknown): boolean {
    return false;
  }

  /**
   * Parse delivery update (not supported by Telegram)
   */
  parseDeliveryUpdate(_payload: unknown): null {
    return null;
  }

  /**
   * Extract callback query ID for acknowledgment
   */
  getCallbackQueryId(payload: unknown): string | null {
    const update = payload as TelegramUpdate;
    return update.callback_query?.id || null;
  }

  /**
   * Check if this is a callback query that needs acknowledgment
   */
  isCallbackQuery(payload: unknown): boolean {
    const update = payload as TelegramUpdate;
    return !!update.callback_query;
  }
}

/**
 * Create a Telegram webhook parser instance
 */
export function createTelegramParser(): TelegramWebhookParser {
  return new TelegramWebhookParser();
}
