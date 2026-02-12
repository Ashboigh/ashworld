/**
 * Telegram Bot API Message Sender
 * https://core.telegram.org/bots/api
 */

import {
  BaseChannelSender,
  Button,
  CardPayload,
  MediaPayload,
  SendResult,
  ChannelCredentials,
  ChannelConfig,
} from "./types";

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

interface TelegramResponse<T = unknown> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

interface TelegramMessage {
  message_id: number;
  chat: { id: number };
  date: number;
}

interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

interface ReplyKeyboardMarkup {
  keyboard: Array<Array<{ text: string }>>;
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
}

export class TelegramSender extends BaseChannelSender {
  private botToken: string;
  private apiBase: string;

  constructor(credentials: ChannelCredentials, config: ChannelConfig = {}) {
    super(credentials, config);

    if (!credentials.botToken) {
      throw new Error("Telegram bot token is required");
    }

    this.botToken = credentials.botToken;
    this.apiBase = `${TELEGRAM_API_BASE}${this.botToken}`;
  }

  /**
   * Send a plain text message
   */
  async sendText(chatId: string, text: string): Promise<SendResult> {
    const response = await this.makeRequest<TelegramResponse<TelegramMessage>>(
      `${this.apiBase}/sendMessage`,
      {
        method: "POST",
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
        }),
      }
    );

    if (response.error || !response.data?.ok) {
      return {
        success: false,
        error: response.error || response.data?.description || "Failed to send message",
        errorCode: response.data?.error_code?.toString(),
      };
    }

    return {
      success: true,
      messageId: response.data.result?.message_id?.toString(),
      externalId: response.data.result?.message_id?.toString(),
    };
  }

  /**
   * Send a message with inline keyboard buttons
   */
  async sendButtons(
    chatId: string,
    text: string,
    buttons: Button[]
  ): Promise<SendResult> {
    // Convert buttons to Telegram inline keyboard format
    // Group buttons in rows of 2
    const inlineKeyboard: InlineKeyboardButton[][] = [];
    let currentRow: InlineKeyboardButton[] = [];

    for (const button of buttons) {
      const telegramButton: InlineKeyboardButton = {
        text: button.label,
      };

      if (button.type === "url" && button.url) {
        telegramButton.url = button.url;
      } else {
        telegramButton.callback_data = button.value;
      }

      currentRow.push(telegramButton);

      // Create new row every 2 buttons (or if button text is long)
      if (currentRow.length >= 2 || button.label.length > 20) {
        inlineKeyboard.push(currentRow);
        currentRow = [];
      }
    }

    // Add remaining buttons
    if (currentRow.length > 0) {
      inlineKeyboard.push(currentRow);
    }

    const replyMarkup: InlineKeyboardMarkup = {
      inline_keyboard: inlineKeyboard,
    };

    const response = await this.makeRequest<TelegramResponse<TelegramMessage>>(
      `${this.apiBase}/sendMessage`,
      {
        method: "POST",
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          reply_markup: replyMarkup,
        }),
      }
    );

    if (response.error || !response.data?.ok) {
      return {
        success: false,
        error: response.error || response.data?.description || "Failed to send message",
        errorCode: response.data?.error_code?.toString(),
      };
    }

    return {
      success: true,
      messageId: response.data.result?.message_id?.toString(),
      externalId: response.data.result?.message_id?.toString(),
    };
  }

  /**
   * Send a message with reply keyboard (quick replies)
   */
  async sendQuickReplies(
    chatId: string,
    text: string,
    quickReplies: Array<{ label: string; value: string }>
  ): Promise<SendResult> {
    // Use reply keyboard for quick replies
    const keyboard: Array<Array<{ text: string }>> = [];
    let currentRow: Array<{ text: string }> = [];

    for (const qr of quickReplies) {
      currentRow.push({ text: qr.label });

      if (currentRow.length >= 2) {
        keyboard.push(currentRow);
        currentRow = [];
      }
    }

    if (currentRow.length > 0) {
      keyboard.push(currentRow);
    }

    const replyMarkup: ReplyKeyboardMarkup = {
      keyboard,
      resize_keyboard: true,
      one_time_keyboard: true,
    };

    const response = await this.makeRequest<TelegramResponse<TelegramMessage>>(
      `${this.apiBase}/sendMessage`,
      {
        method: "POST",
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          reply_markup: replyMarkup,
        }),
      }
    );

    if (response.error || !response.data?.ok) {
      return {
        success: false,
        error: response.error || response.data?.description || "Failed to send message",
        errorCode: response.data?.error_code?.toString(),
      };
    }

    return {
      success: true,
      messageId: response.data.result?.message_id?.toString(),
      externalId: response.data.result?.message_id?.toString(),
    };
  }

  /**
   * Send media (photo, video, audio, document)
   */
  async sendMedia(chatId: string, media: MediaPayload): Promise<SendResult> {
    let endpoint: string;
    let bodyKey: string;

    switch (media.type) {
      case "image":
        endpoint = "sendPhoto";
        bodyKey = "photo";
        break;
      case "video":
        endpoint = "sendVideo";
        bodyKey = "video";
        break;
      case "audio":
        endpoint = "sendAudio";
        bodyKey = "audio";
        break;
      case "document":
      case "file":
        endpoint = "sendDocument";
        bodyKey = "document";
        break;
      default:
        return {
          success: false,
          error: `Unsupported media type: ${media.type}`,
        };
    }

    const body: Record<string, unknown> = {
      chat_id: chatId,
    };

    if (media.url) {
      body[bodyKey] = media.url;
    } else {
      return {
        success: false,
        error: "Media URL is required",
      };
    }

    if (media.caption) {
      body.caption = media.caption;
      body.parse_mode = "HTML";
    }

    const response = await this.makeRequest<TelegramResponse<TelegramMessage>>(
      `${this.apiBase}/${endpoint}`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    if (response.error || !response.data?.ok) {
      return {
        success: false,
        error: response.error || response.data?.description || "Failed to send media",
        errorCode: response.data?.error_code?.toString(),
      };
    }

    return {
      success: true,
      messageId: response.data.result?.message_id?.toString(),
      externalId: response.data.result?.message_id?.toString(),
    };
  }

  /**
   * Send cards as a series of messages with photos and buttons
   */
  async sendCards(chatId: string, cards: CardPayload[]): Promise<SendResult> {
    // Telegram doesn't have native carousel support
    // Send each card as a separate message with optional photo
    for (const card of cards) {
      let text = `<b>${card.title}</b>`;
      if (card.subtitle) {
        text += `\n${card.subtitle}`;
      }

      if (card.imageUrl) {
        // Send photo with caption and buttons
        const buttons = card.buttons || [];
        const inlineKeyboard: InlineKeyboardButton[][] = buttons.map((btn) => [
          {
            text: btn.label,
            ...(btn.type === "url" && btn.url
              ? { url: btn.url }
              : { callback_data: btn.value }),
          },
        ]);

        const response = await this.makeRequest<TelegramResponse<TelegramMessage>>(
          `${this.apiBase}/sendPhoto`,
          {
            method: "POST",
            body: JSON.stringify({
              chat_id: chatId,
              photo: card.imageUrl,
              caption: text,
              parse_mode: "HTML",
              reply_markup: inlineKeyboard.length > 0
                ? { inline_keyboard: inlineKeyboard }
                : undefined,
            }),
          }
        );

        if (response.error || !response.data?.ok) {
          return {
            success: false,
            error: response.error || response.data?.description || "Failed to send card",
            errorCode: response.data?.error_code?.toString(),
          };
        }
      } else if (card.buttons && card.buttons.length > 0) {
        // Send text with buttons
        const result = await this.sendButtons(chatId, text, card.buttons);
        if (!result.success) return result;
      } else {
        // Send text only
        const result = await this.sendText(chatId, text);
        if (!result.success) return result;
      }
    }

    return { success: true };
  }

  /**
   * Edit an existing message (useful for updating button selections)
   */
  async editMessageText(
    chatId: string,
    messageId: string,
    text: string,
    buttons?: Button[]
  ): Promise<SendResult> {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      message_id: parseInt(messageId, 10),
      text,
      parse_mode: "HTML",
    };

    if (buttons && buttons.length > 0) {
      const inlineKeyboard: InlineKeyboardButton[][] = [];
      let currentRow: InlineKeyboardButton[] = [];

      for (const button of buttons) {
        currentRow.push({
          text: button.label,
          ...(button.type === "url" && button.url
            ? { url: button.url }
            : { callback_data: button.value }),
        });

        if (currentRow.length >= 2) {
          inlineKeyboard.push(currentRow);
          currentRow = [];
        }
      }

      if (currentRow.length > 0) {
        inlineKeyboard.push(currentRow);
      }

      body.reply_markup = { inline_keyboard: inlineKeyboard };
    }

    const response = await this.makeRequest<TelegramResponse<TelegramMessage>>(
      `${this.apiBase}/editMessageText`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    if (response.error || !response.data?.ok) {
      return {
        success: false,
        error: response.error || response.data?.description || "Failed to edit message",
        errorCode: response.data?.error_code?.toString(),
      };
    }

    return {
      success: true,
      messageId,
      externalId: messageId,
    };
  }

  /**
   * Answer a callback query (acknowledge button click)
   */
  async answerCallbackQuery(
    callbackQueryId: string,
    text?: string,
    showAlert?: boolean
  ): Promise<SendResult> {
    const response = await this.makeRequest<TelegramResponse<boolean>>(
      `${this.apiBase}/answerCallbackQuery`,
      {
        method: "POST",
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text,
          show_alert: showAlert,
        }),
      }
    );

    if (response.error || !response.data?.ok) {
      return {
        success: false,
        error: response.error || response.data?.description || "Failed to answer callback",
        errorCode: response.data?.error_code?.toString(),
      };
    }

    return { success: true };
  }

  /**
   * Set webhook URL for this bot
   */
  async setWebhook(webhookUrl: string, secretToken?: string): Promise<SendResult> {
    const body: Record<string, unknown> = {
      url: webhookUrl,
      allowed_updates: ["message", "callback_query"],
    };

    if (secretToken) {
      body.secret_token = secretToken;
    }

    const response = await this.makeRequest<TelegramResponse<boolean>>(
      `${this.apiBase}/setWebhook`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    if (response.error || !response.data?.ok) {
      return {
        success: false,
        error: response.error || response.data?.description || "Failed to set webhook",
        errorCode: response.data?.error_code?.toString(),
      };
    }

    return { success: true };
  }

  /**
   * Delete webhook (for switching to polling mode or resetting)
   */
  async deleteWebhook(): Promise<SendResult> {
    const response = await this.makeRequest<TelegramResponse<boolean>>(
      `${this.apiBase}/deleteWebhook`,
      {
        method: "POST",
      }
    );

    if (response.error || !response.data?.ok) {
      return {
        success: false,
        error: response.error || response.data?.description || "Failed to delete webhook",
        errorCode: response.data?.error_code?.toString(),
      };
    }

    return { success: true };
  }

  /**
   * Get bot info
   */
  async getMe(): Promise<{
    success: boolean;
    data?: {
      id: number;
      username: string;
      firstName: string;
    };
    error?: string;
  }> {
    const response = await this.makeRequest<
      TelegramResponse<{
        id: number;
        is_bot: boolean;
        first_name: string;
        username: string;
      }>
    >(`${this.apiBase}/getMe`, { method: "GET" });

    if (response.error || !response.data?.ok || !response.data.result) {
      return {
        success: false,
        error: response.error || response.data?.description || "Failed to get bot info",
      };
    }

    return {
      success: true,
      data: {
        id: response.data.result.id,
        username: response.data.result.username,
        firstName: response.data.result.first_name,
      },
    };
  }
}

/**
 * Create a Telegram sender instance from channel credentials
 */
export function createTelegramSender(
  credentials: ChannelCredentials,
  config: ChannelConfig = {}
): TelegramSender {
  return new TelegramSender(credentials, config);
}
