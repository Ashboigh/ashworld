/**
 * WhatsApp Cloud API Message Sender
 * https://developers.facebook.com/docs/whatsapp/cloud-api
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

const GRAPH_API_VERSION = "v18.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface WhatsAppResponse {
  messaging_product?: string;
  contacts?: Array<{ input: string; wa_id: string }>;
  messages?: Array<{ id: string }>;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

interface WhatsAppInteractiveButton {
  type: "reply";
  reply: {
    id: string;
    title: string;
  };
}

interface WhatsAppInteractiveListRow {
  id: string;
  title: string;
  description?: string;
}

interface WhatsAppInteractiveListSection {
  title?: string;
  rows: WhatsAppInteractiveListRow[];
}

export class WhatsAppSender extends BaseChannelSender {
  private accessToken: string;
  private phoneNumberId: string;

  constructor(credentials: ChannelCredentials, config: ChannelConfig = {}) {
    super(credentials, config);

    if (!credentials.accessToken) {
      throw new Error("WhatsApp access token is required");
    }

    if (!config.phoneNumberId && !credentials.phoneNumber) {
      throw new Error("WhatsApp phone number ID is required");
    }

    this.accessToken = credentials.accessToken;
    this.phoneNumberId =
      (config.phoneNumberId as string) || credentials.phoneNumber || "";
  }

  /**
   * Send a plain text message
   */
  async sendText(recipientPhone: string, text: string): Promise<SendResult> {
    const response = await this.makeRequest<WhatsAppResponse>(
      `${GRAPH_API_BASE}/${this.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: this.formatPhoneNumber(recipientPhone),
          type: "text",
          text: {
            preview_url: true,
            body: text,
          },
        }),
      }
    );

    if (response.error || response.data?.error) {
      const error = response.data?.error || { message: response.error };
      return {
        success: false,
        error: error.message || "Failed to send message",
        errorCode: error.code?.toString(),
      };
    }

    return {
      success: true,
      messageId: response.data?.messages?.[0]?.id,
      externalId: response.data?.messages?.[0]?.id,
    };
  }

  /**
   * Send a message with interactive buttons (max 3 buttons)
   */
  async sendButtons(
    recipientPhone: string,
    text: string,
    buttons: Button[]
  ): Promise<SendResult> {
    // WhatsApp allows max 3 buttons for interactive messages
    const limitedButtons = buttons.slice(0, 3);

    // If more than 3 buttons, use list instead
    if (buttons.length > 3) {
      return this.sendList(recipientPhone, text, buttons);
    }

    const interactiveButtons: WhatsAppInteractiveButton[] = limitedButtons.map(
      (btn, index) => ({
        type: "reply",
        reply: {
          id: btn.value || `btn_${index}`,
          title: btn.label.substring(0, 20), // Max 20 chars for button title
        },
      })
    );

    const response = await this.makeRequest<WhatsAppResponse>(
      `${GRAPH_API_BASE}/${this.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: this.formatPhoneNumber(recipientPhone),
          type: "interactive",
          interactive: {
            type: "button",
            body: {
              text: text.substring(0, 1024), // Max 1024 chars
            },
            action: {
              buttons: interactiveButtons,
            },
          },
        }),
      }
    );

    if (response.error || response.data?.error) {
      const error = response.data?.error || { message: response.error };
      return {
        success: false,
        error: error.message || "Failed to send message",
        errorCode: error.code?.toString(),
      };
    }

    return {
      success: true,
      messageId: response.data?.messages?.[0]?.id,
      externalId: response.data?.messages?.[0]?.id,
    };
  }

  /**
   * Send an interactive list (for more than 3 options)
   */
  async sendList(
    recipientPhone: string,
    text: string,
    options: Button[],
    buttonText: string = "Select Option"
  ): Promise<SendResult> {
    const sections: WhatsAppInteractiveListSection[] = [
      {
        title: "Options",
        rows: options.slice(0, 10).map((opt, index) => ({
          id: opt.value || `opt_${index}`,
          title: opt.label.substring(0, 24), // Max 24 chars
          description: "", // Optional description
        })),
      },
    ];

    const response = await this.makeRequest<WhatsAppResponse>(
      `${GRAPH_API_BASE}/${this.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: this.formatPhoneNumber(recipientPhone),
          type: "interactive",
          interactive: {
            type: "list",
            body: {
              text: text.substring(0, 1024),
            },
            action: {
              button: buttonText.substring(0, 20),
              sections,
            },
          },
        }),
      }
    );

    if (response.error || response.data?.error) {
      const error = response.data?.error || { message: response.error };
      return {
        success: false,
        error: error.message || "Failed to send list",
        errorCode: error.code?.toString(),
      };
    }

    return {
      success: true,
      messageId: response.data?.messages?.[0]?.id,
      externalId: response.data?.messages?.[0]?.id,
    };
  }

  /**
   * Send media (image, video, audio, document)
   */
  async sendMedia(
    recipientPhone: string,
    media: MediaPayload
  ): Promise<SendResult> {
    let mediaType: string;
    let mediaKey: string;

    switch (media.type) {
      case "image":
        mediaType = "image";
        mediaKey = "image";
        break;
      case "video":
        mediaType = "video";
        mediaKey = "video";
        break;
      case "audio":
        mediaType = "audio";
        mediaKey = "audio";
        break;
      case "document":
      case "file":
        mediaType = "document";
        mediaKey = "document";
        break;
      default:
        return {
          success: false,
          error: `Unsupported media type: ${media.type}`,
        };
    }

    const mediaObject: Record<string, unknown> = {};

    if (media.url) {
      mediaObject.link = media.url;
    } else {
      return {
        success: false,
        error: "Media URL is required",
      };
    }

    if (media.caption) {
      mediaObject.caption = media.caption.substring(0, 1024);
    }

    if (media.filename && mediaType === "document") {
      mediaObject.filename = media.filename;
    }

    const response = await this.makeRequest<WhatsAppResponse>(
      `${GRAPH_API_BASE}/${this.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: this.formatPhoneNumber(recipientPhone),
          type: mediaType,
          [mediaKey]: mediaObject,
        }),
      }
    );

    if (response.error || response.data?.error) {
      const error = response.data?.error || { message: response.error };
      return {
        success: false,
        error: error.message || "Failed to send media",
        errorCode: error.code?.toString(),
      };
    }

    return {
      success: true,
      messageId: response.data?.messages?.[0]?.id,
      externalId: response.data?.messages?.[0]?.id,
    };
  }

  /**
   * Send cards as a series of messages
   * WhatsApp doesn't have native carousel, so we send each card separately
   */
  async sendCards(
    recipientPhone: string,
    cards: CardPayload[]
  ): Promise<SendResult> {
    for (const card of cards) {
      // Send image if present
      if (card.imageUrl) {
        const mediaResult = await this.sendMedia(recipientPhone, {
          type: "image",
          url: card.imageUrl,
          caption: `*${card.title}*${card.subtitle ? `\n${card.subtitle}` : ""}`,
        });
        if (!mediaResult.success) return mediaResult;
      } else {
        // Send text with title and subtitle
        const text = `*${card.title}*${card.subtitle ? `\n${card.subtitle}` : ""}`;
        const textResult = await this.sendText(recipientPhone, text);
        if (!textResult.success) return textResult;
      }

      // Send buttons if present
      if (card.buttons && card.buttons.length > 0) {
        const buttonResult = await this.sendButtons(
          recipientPhone,
          "Select an option:",
          card.buttons
        );
        if (!buttonResult.success) return buttonResult;
      }
    }

    return { success: true };
  }

  /**
   * Send a template message (required for initiating conversations)
   */
  async sendTemplate(
    recipientPhone: string,
    templateName: string,
    languageCode: string = "en",
    components?: Array<{
      type: "header" | "body" | "button";
      parameters: Array<{
        type: "text" | "image" | "document" | "video";
        text?: string;
        image?: { link: string };
        document?: { link: string; filename?: string };
        video?: { link: string };
      }>;
    }>
  ): Promise<SendResult> {
    const template: Record<string, unknown> = {
      name: templateName,
      language: {
        code: languageCode,
      },
    };

    if (components && components.length > 0) {
      template.components = components;
    }

    const response = await this.makeRequest<WhatsAppResponse>(
      `${GRAPH_API_BASE}/${this.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: this.formatPhoneNumber(recipientPhone),
          type: "template",
          template,
        }),
      }
    );

    if (response.error || response.data?.error) {
      const error = response.data?.error || { message: response.error };
      return {
        success: false,
        error: error.message || "Failed to send template",
        errorCode: error.code?.toString(),
      };
    }

    return {
      success: true,
      messageId: response.data?.messages?.[0]?.id,
      externalId: response.data?.messages?.[0]?.id,
    };
  }

  /**
   * Mark a message as read
   */
  async markAsRead(messageId: string): Promise<SendResult> {
    const response = await this.makeRequest<WhatsAppResponse>(
      `${GRAPH_API_BASE}/${this.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          status: "read",
          message_id: messageId,
        }),
      }
    );

    if (response.error || response.data?.error) {
      return {
        success: false,
        error: response.data?.error?.message || response.error || "Failed to mark as read",
      };
    }

    return { success: true };
  }

  /**
   * Send a reaction to a message
   */
  async sendReaction(
    recipientPhone: string,
    messageId: string,
    emoji: string
  ): Promise<SendResult> {
    const response = await this.makeRequest<WhatsAppResponse>(
      `${GRAPH_API_BASE}/${this.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: this.formatPhoneNumber(recipientPhone),
          type: "reaction",
          reaction: {
            message_id: messageId,
            emoji,
          },
        }),
      }
    );

    if (response.error || response.data?.error) {
      return {
        success: false,
        error: response.data?.error?.message || response.error || "Failed to send reaction",
      };
    }

    return { success: true };
  }

  /**
   * Format phone number to WhatsApp format (no + or spaces)
   */
  private formatPhoneNumber(phone: string): string {
    return phone.replace(/[^0-9]/g, "");
  }

  /**
   * Get business profile
   */
  async getBusinessProfile(): Promise<{
    success: boolean;
    data?: {
      about?: string;
      address?: string;
      description?: string;
      email?: string;
      vertical?: string;
      websites?: string[];
    };
    error?: string;
  }> {
    const response = await this.makeRequest<{
      data?: Array<{
        about?: string;
        address?: string;
        description?: string;
        email?: string;
        vertical?: string;
        websites?: string[];
      }>;
      error?: { message: string };
    }>(
      `${GRAPH_API_BASE}/${this.phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,vertical,websites`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (response.error || response.data?.error) {
      return {
        success: false,
        error: response.data?.error?.message || response.error || "Failed to get profile",
      };
    }

    return {
      success: true,
      data: response.data?.data?.[0],
    };
  }
}

/**
 * Create a WhatsApp sender instance from channel credentials
 */
export function createWhatsAppSender(
  credentials: ChannelCredentials,
  config: ChannelConfig = {}
): WhatsAppSender {
  return new WhatsAppSender(credentials, config);
}
