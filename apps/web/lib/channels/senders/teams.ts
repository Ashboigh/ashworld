/**
 * Microsoft Teams Bot Framework Message Sender
 * https://docs.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages
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

const BOT_FRAMEWORK_TOKEN_URL = "https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token";

interface TeamsResponse {
  id?: string;
  error?: {
    code: string;
    message: string;
  };
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface AdaptiveCardAction {
  type: "Action.Submit" | "Action.OpenUrl" | "Action.ShowCard";
  title: string;
  data?: { action: string };
  url?: string;
}

interface AdaptiveCardElement {
  type: string;
  text?: string;
  size?: string;
  weight?: string;
  wrap?: boolean;
  url?: string;
  altText?: string;
  columns?: AdaptiveCardColumn[];
  items?: AdaptiveCardElement[];
  actions?: AdaptiveCardAction[];
}

interface AdaptiveCardColumn {
  type: "Column";
  width: string | number;
  items: AdaptiveCardElement[];
}

interface AdaptiveCard {
  type: "AdaptiveCard";
  $schema: string;
  version: string;
  body: AdaptiveCardElement[];
  actions?: AdaptiveCardAction[];
}

interface ConversationReference {
  activityId?: string;
  user?: { id: string; name?: string };
  bot?: { id: string; name?: string };
  conversation: { id: string; tenantId?: string };
  channelId: string;
  serviceUrl: string;
}

export class TeamsSender extends BaseChannelSender {
  private appId: string;
  private appPassword: string;
  private serviceUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(credentials: ChannelCredentials, config: ChannelConfig = {}) {
    super(credentials, config);

    if (!credentials.appId) {
      throw new Error("Teams app ID is required");
    }

    if (!credentials.appSecret) {
      throw new Error("Teams app password is required");
    }

    this.appId = credentials.appId;
    this.appPassword = credentials.appSecret;
    // Default service URL, should be obtained from incoming activity
    this.serviceUrl = (config.serviceUrl as string) || "https://smba.trafficmanager.net/teams/";
  }

  /**
   * Send a plain text message
   */
  async sendText(conversationId: string, text: string): Promise<SendResult> {
    const activity = {
      type: "message",
      text,
      textFormat: "plain",
    };

    return this.sendActivity(conversationId, activity);
  }

  /**
   * Send a message with buttons using Adaptive Card
   */
  async sendButtons(
    conversationId: string,
    text: string,
    buttons: Button[]
  ): Promise<SendResult> {
    const card = this.createAdaptiveCard(text, buttons);
    return this.sendAdaptiveCard(conversationId, card);
  }

  /**
   * Send quick replies (same as buttons in Teams)
   */
  async sendQuickReplies(
    conversationId: string,
    text: string,
    quickReplies: Array<{ label: string; value: string }>
  ): Promise<SendResult> {
    const buttons = quickReplies.map((qr) => ({
      label: qr.label,
      value: qr.value,
      type: "reply" as const,
    }));

    return this.sendButtons(conversationId, text, buttons);
  }

  /**
   * Send media (image)
   */
  async sendMedia(conversationId: string, media: MediaPayload): Promise<SendResult> {
    if (media.type === "image" && media.url) {
      const card: AdaptiveCard = {
        type: "AdaptiveCard",
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        version: "1.4",
        body: [
          {
            type: "Image",
            url: media.url,
            altText: media.caption || "Image",
            size: "auto",
          },
        ],
      };

      if (media.caption) {
        card.body.unshift({
          type: "TextBlock",
          text: media.caption,
          wrap: true,
        });
      }

      return this.sendAdaptiveCard(conversationId, card);
    }

    // For other file types, send as link
    if (media.url) {
      const text = media.caption
        ? `${media.caption}\n[Download ${media.filename || "file"}](${media.url})`
        : `[Download ${media.filename || "file"}](${media.url})`;

      return this.sendText(conversationId, text);
    }

    return {
      success: false,
      error: "Media URL is required",
    };
  }

  /**
   * Send cards as Adaptive Cards
   */
  async sendCards(conversationId: string, cards: CardPayload[]): Promise<SendResult> {
    // Teams can handle multiple cards, but we'll send as carousel-style
    for (const card of cards) {
      const adaptiveCard: AdaptiveCard = {
        type: "AdaptiveCard",
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        version: "1.4",
        body: [],
        actions: [],
      };

      // Add image if present
      if (card.imageUrl) {
        adaptiveCard.body.push({
          type: "Image",
          url: card.imageUrl,
          altText: card.title,
          size: "auto",
        });
      }

      // Add title
      adaptiveCard.body.push({
        type: "TextBlock",
        text: card.title,
        size: "Large",
        weight: "Bolder",
        wrap: true,
      });

      // Add subtitle if present
      if (card.subtitle) {
        adaptiveCard.body.push({
          type: "TextBlock",
          text: card.subtitle,
          wrap: true,
        });
      }

      // Add buttons
      if (card.buttons && card.buttons.length > 0) {
        adaptiveCard.actions = card.buttons.map((btn) => this.convertButton(btn));
      }

      const result = await this.sendAdaptiveCard(conversationId, adaptiveCard);
      if (!result.success) {
        return result;
      }
    }

    return { success: true };
  }

  /**
   * Send an Adaptive Card
   */
  async sendAdaptiveCard(
    conversationId: string,
    card: AdaptiveCard
  ): Promise<SendResult> {
    const activity = {
      type: "message",
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          content: card,
        },
      ],
    };

    return this.sendActivity(conversationId, activity);
  }

  /**
   * Send a Hero Card (Teams native card)
   */
  async sendHeroCard(
    conversationId: string,
    title: string,
    subtitle?: string,
    text?: string,
    imageUrl?: string,
    buttons?: Button[]
  ): Promise<SendResult> {
    const heroCard: Record<string, unknown> = {
      title,
    };

    if (subtitle) heroCard.subtitle = subtitle;
    if (text) heroCard.text = text;
    if (imageUrl) {
      heroCard.images = [{ url: imageUrl }];
    }

    if (buttons && buttons.length > 0) {
      heroCard.buttons = buttons.map((btn) => ({
        type: btn.type === "url" ? "openUrl" : "messageBack",
        title: btn.label,
        value: btn.value,
        text: btn.value,
        displayText: btn.label,
        ...(btn.type === "url" && btn.url ? { value: btn.url } : {}),
      }));
    }

    const activity = {
      type: "message",
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.hero",
          content: heroCard,
        },
      ],
    };

    return this.sendActivity(conversationId, activity);
  }

  /**
   * Update an existing message
   */
  async updateMessage(
    conversationId: string,
    activityId: string,
    text: string
  ): Promise<SendResult> {
    const token = await this.getAccessToken();
    if (!token) {
      return {
        success: false,
        error: "Failed to get access token",
      };
    }

    const activity = {
      type: "message",
      id: activityId,
      text,
    };

    const response = await this.makeRequest<TeamsResponse>(
      `${this.serviceUrl}v3/conversations/${conversationId}/activities/${activityId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(activity),
      }
    );

    if (response.error || response.data?.error) {
      return {
        success: false,
        error: response.error || response.data?.error?.message || "Failed to update message",
        errorCode: response.data?.error?.code,
      };
    }

    return {
      success: true,
      messageId: response.data?.id,
      externalId: response.data?.id,
    };
  }

  /**
   * Delete a message
   */
  async deleteMessage(conversationId: string, activityId: string): Promise<SendResult> {
    const token = await this.getAccessToken();
    if (!token) {
      return {
        success: false,
        error: "Failed to get access token",
      };
    }

    const response = await this.makeRequest<TeamsResponse>(
      `${this.serviceUrl}v3/conversations/${conversationId}/activities/${activityId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.error) {
      return {
        success: false,
        error: response.error,
      };
    }

    return { success: true };
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(conversationId: string): Promise<SendResult> {
    const activity = {
      type: "typing",
    };

    return this.sendActivity(conversationId, activity);
  }

  /**
   * Create a new conversation with a user
   */
  async createConversation(
    tenantId: string,
    userId: string,
    botId: string
  ): Promise<{
    success: boolean;
    conversationId?: string;
    error?: string;
  }> {
    const token = await this.getAccessToken();
    if (!token) {
      return {
        success: false,
        error: "Failed to get access token",
      };
    }

    const response = await this.makeRequest<{
      id?: string;
      error?: { message: string };
    }>(`${this.serviceUrl}v3/conversations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        bot: { id: botId },
        members: [{ id: userId }],
        channelData: {
          tenant: { id: tenantId },
        },
        isGroup: false,
      }),
    });

    if (response.error || response.data?.error) {
      return {
        success: false,
        error: response.error || response.data?.error?.message || "Failed to create conversation",
      };
    }

    return {
      success: true,
      conversationId: response.data?.id,
    };
  }

  /**
   * Set the service URL (should be called with URL from incoming activity)
   */
  setServiceUrl(serviceUrl: string): void {
    this.serviceUrl = serviceUrl;
  }

  /**
   * Convert our button format to Adaptive Card action
   */
  private convertButton(button: Button): AdaptiveCardAction {
    if (button.type === "url" && button.url) {
      return {
        type: "Action.OpenUrl",
        title: button.label,
        url: button.url,
      };
    }

    return {
      type: "Action.Submit",
      title: button.label,
      data: { action: button.value },
    };
  }

  /**
   * Create a simple Adaptive Card with text and buttons
   */
  private createAdaptiveCard(text: string, buttons: Button[]): AdaptiveCard {
    return {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      body: [
        {
          type: "TextBlock",
          text,
          wrap: true,
        },
      ],
      actions: buttons.map((btn) => this.convertButton(btn)),
    };
  }

  /**
   * Send an activity to a conversation
   */
  private async sendActivity(
    conversationId: string,
    activity: Record<string, unknown>
  ): Promise<SendResult> {
    const token = await this.getAccessToken();
    if (!token) {
      return {
        success: false,
        error: "Failed to get access token",
      };
    }

    const response = await this.makeRequest<TeamsResponse>(
      `${this.serviceUrl}v3/conversations/${conversationId}/activities`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(activity),
      }
    );

    if (response.error || response.data?.error) {
      return {
        success: false,
        error: response.error || response.data?.error?.message || "Failed to send activity",
        errorCode: response.data?.error?.code,
      };
    }

    return {
      success: true,
      messageId: response.data?.id,
      externalId: response.data?.id,
    };
  }

  /**
   * Get or refresh access token
   */
  private async getAccessToken(): Promise<string | null> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    try {
      const response = await fetch(BOT_FRAMEWORK_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: this.appId,
          client_secret: this.appPassword,
          scope: "https://api.botframework.com/.default",
        }),
      });

      if (!response.ok) {
        console.error("Failed to get Teams access token:", response.status);
        return null;
      }

      const data = (await response.json()) as TokenResponse;
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + data.expires_in * 1000;

      return this.accessToken;
    } catch (error) {
      console.error("Error getting Teams access token:", error);
      return null;
    }
  }
}

/**
 * Create a Teams sender instance from channel credentials
 */
export function createTeamsSender(
  credentials: ChannelCredentials,
  config: ChannelConfig = {}
): TeamsSender {
  return new TeamsSender(credentials, config);
}
