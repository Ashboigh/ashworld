/**
 * Facebook Messenger Send API Message Sender
 * https://developers.facebook.com/docs/messenger-platform/send-messages
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

const GRAPH_API_BASE = "https://graph.facebook.com/v18.0";

interface MessengerResponse {
  recipient_id?: string;
  message_id?: string;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

interface QuickReply {
  content_type: "text" | "user_phone_number" | "user_email";
  title?: string;
  payload?: string;
  image_url?: string;
}

interface MessengerButton {
  type: "postback" | "web_url" | "phone_number";
  title: string;
  payload?: string;
  url?: string;
}

interface GenericTemplateElement {
  title: string;
  subtitle?: string;
  image_url?: string;
  default_action?: {
    type: "web_url";
    url: string;
  };
  buttons?: MessengerButton[];
}

export class MessengerSender extends BaseChannelSender {
  private pageAccessToken: string;
  private pageId: string;

  constructor(credentials: ChannelCredentials, config: ChannelConfig = {}) {
    super(credentials, config);

    if (!credentials.accessToken) {
      throw new Error("Messenger page access token is required");
    }

    if (!credentials.pageId) {
      throw new Error("Messenger page ID is required");
    }

    this.pageAccessToken = credentials.accessToken;
    this.pageId = credentials.pageId;
  }

  /**
   * Send a plain text message
   */
  async sendText(recipientId: string, text: string): Promise<SendResult> {
    return this.sendMessage(recipientId, { text });
  }

  /**
   * Send a message with buttons (max 3 buttons)
   */
  async sendButtons(
    recipientId: string,
    text: string,
    buttons: Button[]
  ): Promise<SendResult> {
    // Messenger button template supports max 3 buttons
    const messengerButtons = buttons.slice(0, 3).map((btn) => this.convertButton(btn));

    const message = {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text,
          buttons: messengerButtons,
        },
      },
    };

    return this.sendMessage(recipientId, message);
  }

  /**
   * Send a message with quick replies (max 13)
   */
  async sendQuickReplies(
    recipientId: string,
    text: string,
    quickReplies: Array<{ label: string; value: string }>
  ): Promise<SendResult> {
    // Messenger supports max 13 quick replies
    const messengerQuickReplies: QuickReply[] = quickReplies
      .slice(0, 13)
      .map((qr) => ({
        content_type: "text" as const,
        title: qr.label.slice(0, 20), // Max 20 characters
        payload: qr.value,
      }));

    const message = {
      text,
      quick_replies: messengerQuickReplies,
    };

    return this.sendMessage(recipientId, message);
  }

  /**
   * Send media (image, video, audio, file)
   */
  async sendMedia(recipientId: string, media: MediaPayload): Promise<SendResult> {
    let attachmentType: string;

    switch (media.type) {
      case "image":
        attachmentType = "image";
        break;
      case "video":
        attachmentType = "video";
        break;
      case "audio":
        attachmentType = "audio";
        break;
      case "document":
      case "file":
        attachmentType = "file";
        break;
      default:
        return {
          success: false,
          error: `Unsupported media type: ${media.type}`,
        };
    }

    if (!media.url) {
      return {
        success: false,
        error: "Media URL is required",
      };
    }

    const message = {
      attachment: {
        type: attachmentType,
        payload: {
          url: media.url,
          is_reusable: true,
        },
      },
    };

    return this.sendMessage(recipientId, message);
  }

  /**
   * Send cards as a generic template carousel
   */
  async sendCards(recipientId: string, cards: CardPayload[]): Promise<SendResult> {
    // Messenger carousel supports max 10 elements
    const elements: GenericTemplateElement[] = cards.slice(0, 10).map((card) => {
      const element: GenericTemplateElement = {
        title: card.title.slice(0, 80), // Max 80 characters
      };

      if (card.subtitle) {
        element.subtitle = card.subtitle.slice(0, 80); // Max 80 characters
      }

      if (card.imageUrl) {
        element.image_url = card.imageUrl;
      }

      if (card.buttons && card.buttons.length > 0) {
        // Max 3 buttons per card
        element.buttons = card.buttons.slice(0, 3).map((btn) => this.convertButton(btn));
      }

      return element;
    });

    const message = {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements,
        },
      },
    };

    return this.sendMessage(recipientId, message);
  }

  /**
   * Send a one-time notification request
   */
  async sendOneTimeNotificationRequest(
    recipientId: string,
    title: string,
    payload: string
  ): Promise<SendResult> {
    const message = {
      attachment: {
        type: "template",
        payload: {
          template_type: "one_time_notif_req",
          title: title.slice(0, 65), // Max 65 characters
          payload,
        },
      },
    };

    return this.sendMessage(recipientId, message);
  }

  /**
   * Mark message as seen (sender action)
   */
  async markSeen(recipientId: string): Promise<SendResult> {
    return this.sendSenderAction(recipientId, "mark_seen");
  }

  /**
   * Show typing indicator
   */
  async showTypingIndicator(recipientId: string, on: boolean): Promise<SendResult> {
    return this.sendSenderAction(recipientId, on ? "typing_on" : "typing_off");
  }

  /**
   * Get user profile information
   */
  async getUserProfile(userId: string): Promise<{
    success: boolean;
    data?: {
      firstName?: string;
      lastName?: string;
      profilePic?: string;
      locale?: string;
      timezone?: number;
    };
    error?: string;
  }> {
    const response = await this.makeRequest<{
      first_name?: string;
      last_name?: string;
      profile_pic?: string;
      locale?: string;
      timezone?: number;
      error?: MessengerResponse["error"];
    }>(
      `${GRAPH_API_BASE}/${userId}?fields=first_name,last_name,profile_pic,locale,timezone&access_token=${this.pageAccessToken}`,
      { method: "GET" }
    );

    if (response.error || response.data?.error) {
      return {
        success: false,
        error: response.error || response.data?.error?.message || "Failed to get profile",
      };
    }

    return {
      success: true,
      data: {
        firstName: response.data?.first_name,
        lastName: response.data?.last_name,
        profilePic: response.data?.profile_pic,
        locale: response.data?.locale,
        timezone: response.data?.timezone,
      },
    };
  }

  /**
   * Set persistent menu for the page
   */
  async setPersistentMenu(
    menu: Array<{
      locale: string;
      composer_input_disabled?: boolean;
      call_to_actions: MessengerButton[];
    }>
  ): Promise<SendResult> {
    const response = await this.makeRequest<MessengerResponse>(
      `${GRAPH_API_BASE}/me/messenger_profile?access_token=${this.pageAccessToken}`,
      {
        method: "POST",
        body: JSON.stringify({
          persistent_menu: menu,
        }),
      }
    );

    if (response.error || response.data?.error) {
      return {
        success: false,
        error: response.error || response.data?.error?.message || "Failed to set menu",
        errorCode: response.data?.error?.code?.toString(),
      };
    }

    return { success: true };
  }

  /**
   * Set greeting text for the page
   */
  async setGreetingText(
    greetings: Array<{ locale: string; text: string }>
  ): Promise<SendResult> {
    const response = await this.makeRequest<MessengerResponse>(
      `${GRAPH_API_BASE}/me/messenger_profile?access_token=${this.pageAccessToken}`,
      {
        method: "POST",
        body: JSON.stringify({
          greeting: greetings.map((g) => ({
            locale: g.locale,
            text: g.text.slice(0, 160), // Max 160 characters
          })),
        }),
      }
    );

    if (response.error || response.data?.error) {
      return {
        success: false,
        error: response.error || response.data?.error?.message || "Failed to set greeting",
        errorCode: response.data?.error?.code?.toString(),
      };
    }

    return { success: true };
  }

  /**
   * Set get started button payload
   */
  async setGetStartedButton(payload: string): Promise<SendResult> {
    const response = await this.makeRequest<MessengerResponse>(
      `${GRAPH_API_BASE}/me/messenger_profile?access_token=${this.pageAccessToken}`,
      {
        method: "POST",
        body: JSON.stringify({
          get_started: { payload },
        }),
      }
    );

    if (response.error || response.data?.error) {
      return {
        success: false,
        error: response.error || response.data?.error?.message || "Failed to set get started",
        errorCode: response.data?.error?.code?.toString(),
      };
    }

    return { success: true };
  }

  /**
   * Convert our button format to Messenger format
   */
  private convertButton(button: Button): MessengerButton {
    if (button.type === "url" && button.url) {
      return {
        type: "web_url",
        title: button.label.slice(0, 20), // Max 20 characters
        url: button.url,
      };
    }

    return {
      type: "postback",
      title: button.label.slice(0, 20), // Max 20 characters
      payload: button.value,
    };
  }

  /**
   * Send a message using the Send API
   */
  private async sendMessage(
    recipientId: string,
    message: Record<string, unknown>
  ): Promise<SendResult> {
    const response = await this.makeRequest<MessengerResponse>(
      `${GRAPH_API_BASE}/me/messages?access_token=${this.pageAccessToken}`,
      {
        method: "POST",
        body: JSON.stringify({
          recipient: { id: recipientId },
          message,
          messaging_type: "RESPONSE",
        }),
      }
    );

    if (response.error || response.data?.error) {
      return {
        success: false,
        error: response.error || response.data?.error?.message || "Failed to send message",
        errorCode: response.data?.error?.code?.toString(),
      };
    }

    return {
      success: true,
      messageId: response.data?.message_id,
      externalId: response.data?.message_id,
    };
  }

  /**
   * Send a sender action (typing indicator, mark seen)
   */
  private async sendSenderAction(
    recipientId: string,
    action: "mark_seen" | "typing_on" | "typing_off"
  ): Promise<SendResult> {
    const response = await this.makeRequest<MessengerResponse>(
      `${GRAPH_API_BASE}/me/messages?access_token=${this.pageAccessToken}`,
      {
        method: "POST",
        body: JSON.stringify({
          recipient: { id: recipientId },
          sender_action: action,
        }),
      }
    );

    if (response.error || response.data?.error) {
      return {
        success: false,
        error: response.error || response.data?.error?.message || "Failed to send action",
        errorCode: response.data?.error?.code?.toString(),
      };
    }

    return { success: true };
  }
}

/**
 * Create a Messenger sender instance from channel credentials
 */
export function createMessengerSender(
  credentials: ChannelCredentials,
  config: ChannelConfig = {}
): MessengerSender {
  return new MessengerSender(credentials, config);
}
