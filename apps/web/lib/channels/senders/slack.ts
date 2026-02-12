/**
 * Slack Web API Message Sender
 * https://api.slack.com/methods
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

const SLACK_API_BASE = "https://slack.com/api";

interface SlackResponse {
  ok: boolean;
  error?: string;
  ts?: string;
  channel?: string;
  message?: {
    ts: string;
    text: string;
  };
}

interface SlackBlock {
  type: string;
  text?: SlackTextObject;
  block_id?: string;
  accessory?: SlackElement;
  elements?: SlackElement[];
  image_url?: string;
  alt_text?: string;
  title?: SlackTextObject;
  fields?: SlackTextObject[];
}

interface SlackTextObject {
  type: "plain_text" | "mrkdwn";
  text: string;
  emoji?: boolean;
}

interface SlackElement {
  type: string;
  text?: SlackTextObject;
  action_id?: string;
  value?: string;
  url?: string;
  style?: "primary" | "danger";
  image_url?: string;
  alt_text?: string;
}

export class SlackSender extends BaseChannelSender {
  private botToken: string;

  constructor(credentials: ChannelCredentials, config: ChannelConfig = {}) {
    super(credentials, config);

    if (!credentials.botToken) {
      throw new Error("Slack bot token is required");
    }

    this.botToken = credentials.botToken;
  }

  /**
   * Send a plain text message
   */
  async sendText(channelId: string, text: string): Promise<SendResult> {
    const response = await this.makeRequest<SlackResponse>(
      `${SLACK_API_BASE}/chat.postMessage`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.botToken}`,
        },
        body: JSON.stringify({
          channel: channelId,
          text,
          mrkdwn: true,
        }),
      }
    );

    if (response.error || !response.data?.ok) {
      return {
        success: false,
        error: response.error || response.data?.error || "Failed to send message",
      };
    }

    return {
      success: true,
      messageId: response.data.ts,
      externalId: response.data.ts,
    };
  }

  /**
   * Send a message with buttons using Block Kit
   */
  async sendButtons(
    channelId: string,
    text: string,
    buttons: Button[]
  ): Promise<SendResult> {
    const blocks: SlackBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text,
        },
      },
      {
        type: "actions",
        elements: buttons.map((btn, index) => this.convertButton(btn, `button_${index}`)),
      },
    ];

    return this.sendBlocks(channelId, text, blocks);
  }

  /**
   * Send a message with quick replies (buttons in Slack)
   */
  async sendQuickReplies(
    channelId: string,
    text: string,
    quickReplies: Array<{ label: string; value: string }>
  ): Promise<SendResult> {
    const buttons = quickReplies.map((qr) => ({
      label: qr.label,
      value: qr.value,
      type: "reply" as const,
    }));

    return this.sendButtons(channelId, text, buttons);
  }

  /**
   * Send media (image, file)
   */
  async sendMedia(channelId: string, media: MediaPayload): Promise<SendResult> {
    if (media.type === "image" && media.url) {
      const blocks: SlackBlock[] = [
        {
          type: "image",
          image_url: media.url,
          alt_text: media.caption || "Image",
          title: media.caption
            ? {
                type: "plain_text",
                text: media.caption,
              }
            : undefined,
        },
      ];

      return this.sendBlocks(channelId, media.caption || "Image", blocks);
    }

    // For other file types, use file upload or share URL
    if (media.url) {
      const text = media.caption
        ? `${media.caption}\n<${media.url}|Download ${media.filename || "file"}>`
        : `<${media.url}|Download ${media.filename || "file"}>`;

      return this.sendText(channelId, text);
    }

    return {
      success: false,
      error: "Media URL is required",
    };
  }

  /**
   * Send cards as Block Kit sections
   */
  async sendCards(channelId: string, cards: CardPayload[]): Promise<SendResult> {
    const blocks: SlackBlock[] = [];

    for (const card of cards) {
      // Add image block if present
      if (card.imageUrl) {
        blocks.push({
          type: "image",
          image_url: card.imageUrl,
          alt_text: card.title,
        });
      }

      // Add section with title and subtitle
      const sectionBlock: SlackBlock = {
        type: "section",
        text: {
          type: "mrkdwn",
          text: card.subtitle ? `*${card.title}*\n${card.subtitle}` : `*${card.title}*`,
        },
      };

      // If there's only one button, add it as accessory
      if (card.buttons && card.buttons.length === 1) {
        sectionBlock.accessory = this.convertButton(card.buttons[0], `card_button_0`);
      }

      blocks.push(sectionBlock);

      // If there are multiple buttons, add actions block
      if (card.buttons && card.buttons.length > 1) {
        blocks.push({
          type: "actions",
          elements: card.buttons.map((btn, index) =>
            this.convertButton(btn, `card_button_${index}`)
          ),
        });
      }

      // Add divider between cards
      if (cards.indexOf(card) < cards.length - 1) {
        blocks.push({ type: "divider" });
      }
    }

    return this.sendBlocks(channelId, cards[0]?.title || "Cards", blocks);
  }

  /**
   * Update an existing message
   */
  async updateMessage(
    channelId: string,
    messageTs: string,
    text: string,
    blocks?: SlackBlock[]
  ): Promise<SendResult> {
    const body: Record<string, unknown> = {
      channel: channelId,
      ts: messageTs,
      text,
    };

    if (blocks) {
      body.blocks = blocks;
    }

    const response = await this.makeRequest<SlackResponse>(
      `${SLACK_API_BASE}/chat.update`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.botToken}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (response.error || !response.data?.ok) {
      return {
        success: false,
        error: response.error || response.data?.error || "Failed to update message",
      };
    }

    return {
      success: true,
      messageId: response.data.ts,
      externalId: response.data.ts,
    };
  }

  /**
   * Delete a message
   */
  async deleteMessage(channelId: string, messageTs: string): Promise<SendResult> {
    const response = await this.makeRequest<SlackResponse>(
      `${SLACK_API_BASE}/chat.delete`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.botToken}`,
        },
        body: JSON.stringify({
          channel: channelId,
          ts: messageTs,
        }),
      }
    );

    if (response.error || !response.data?.ok) {
      return {
        success: false,
        error: response.error || response.data?.error || "Failed to delete message",
      };
    }

    return { success: true };
  }

  /**
   * Send an ephemeral message (only visible to one user)
   */
  async sendEphemeral(
    channelId: string,
    userId: string,
    text: string,
    blocks?: SlackBlock[]
  ): Promise<SendResult> {
    const body: Record<string, unknown> = {
      channel: channelId,
      user: userId,
      text,
    };

    if (blocks) {
      body.blocks = blocks;
    }

    const response = await this.makeRequest<SlackResponse>(
      `${SLACK_API_BASE}/chat.postEphemeral`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.botToken}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (response.error || !response.data?.ok) {
      return {
        success: false,
        error: response.error || response.data?.error || "Failed to send ephemeral",
      };
    }

    return {
      success: true,
      messageId: response.data.ts,
      externalId: response.data.ts,
    };
  }

  /**
   * Open a direct message channel with a user
   */
  async openDM(userId: string): Promise<{
    success: boolean;
    channelId?: string;
    error?: string;
  }> {
    const response = await this.makeRequest<{
      ok: boolean;
      error?: string;
      channel?: { id: string };
    }>(`${SLACK_API_BASE}/conversations.open`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.botToken}`,
      },
      body: JSON.stringify({
        users: userId,
      }),
    });

    if (response.error || !response.data?.ok) {
      return {
        success: false,
        error: response.error || response.data?.error || "Failed to open DM",
      };
    }

    return {
      success: true,
      channelId: response.data.channel?.id,
    };
  }

  /**
   * Get user info
   */
  async getUserInfo(userId: string): Promise<{
    success: boolean;
    data?: {
      id: string;
      name: string;
      realName?: string;
      email?: string;
      avatar?: string;
    };
    error?: string;
  }> {
    const response = await this.makeRequest<{
      ok: boolean;
      error?: string;
      user?: {
        id: string;
        name: string;
        real_name?: string;
        profile?: {
          email?: string;
          image_72?: string;
        };
      };
    }>(`${SLACK_API_BASE}/users.info?user=${userId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.botToken}`,
      },
    });

    if (response.error || !response.data?.ok || !response.data.user) {
      return {
        success: false,
        error: response.error || response.data?.error || "Failed to get user info",
      };
    }

    return {
      success: true,
      data: {
        id: response.data.user.id,
        name: response.data.user.name,
        realName: response.data.user.real_name,
        email: response.data.user.profile?.email,
        avatar: response.data.user.profile?.image_72,
      },
    };
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(
    channelId: string,
    messageTs: string,
    emoji: string
  ): Promise<SendResult> {
    const response = await this.makeRequest<SlackResponse>(
      `${SLACK_API_BASE}/reactions.add`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.botToken}`,
        },
        body: JSON.stringify({
          channel: channelId,
          timestamp: messageTs,
          name: emoji.replace(/:/g, ""), // Remove colons if present
        }),
      }
    );

    if (response.error || !response.data?.ok) {
      return {
        success: false,
        error: response.error || response.data?.error || "Failed to add reaction",
      };
    }

    return { success: true };
  }

  /**
   * Convert our button format to Slack Block Kit format
   */
  private convertButton(button: Button, actionId: string): SlackElement {
    if (button.type === "url" && button.url) {
      return {
        type: "button",
        text: {
          type: "plain_text",
          text: button.label.slice(0, 75), // Max 75 characters
          emoji: true,
        },
        url: button.url,
        action_id: actionId,
      };
    }

    return {
      type: "button",
      text: {
        type: "plain_text",
        text: button.label.slice(0, 75), // Max 75 characters
        emoji: true,
      },
      value: button.value,
      action_id: actionId,
    };
  }

  /**
   * Send a message with Block Kit blocks
   */
  private async sendBlocks(
    channelId: string,
    fallbackText: string,
    blocks: SlackBlock[]
  ): Promise<SendResult> {
    const response = await this.makeRequest<SlackResponse>(
      `${SLACK_API_BASE}/chat.postMessage`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.botToken}`,
        },
        body: JSON.stringify({
          channel: channelId,
          text: fallbackText,
          blocks,
        }),
      }
    );

    if (response.error || !response.data?.ok) {
      return {
        success: false,
        error: response.error || response.data?.error || "Failed to send message",
      };
    }

    return {
      success: true,
      messageId: response.data.ts,
      externalId: response.data.ts,
    };
  }
}

/**
 * Create a Slack sender instance from channel credentials
 */
export function createSlackSender(
  credentials: ChannelCredentials,
  config: ChannelConfig = {}
): SlackSender {
  return new SlackSender(credentials, config);
}
