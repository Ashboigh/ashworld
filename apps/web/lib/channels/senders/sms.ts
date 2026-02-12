/**
 * Twilio SMS/MMS Message Sender
 * https://www.twilio.com/docs/sms/api/message-resource
 */

import {
  BaseChannelSender,
  Button,
  CardPayload,
  MediaPayload,
  SendResult,
  ChannelCredentials,
  ChannelConfig,
  DeliveryStatus,
} from "./types";

const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";

interface TwilioMessageResponse {
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
  num_segments: string;
  error_code?: number;
  error_message?: string;
  date_created: string;
  date_sent?: string;
}

interface TwilioError {
  code: number;
  message: string;
  status: number;
}

export class SMSSender extends BaseChannelSender {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;
  private messagingServiceSid?: string;

  constructor(credentials: ChannelCredentials, config: ChannelConfig = {}) {
    super(credentials, config);

    if (!credentials.accountSid) {
      throw new Error("Twilio account SID is required");
    }

    if (!credentials.authToken) {
      throw new Error("Twilio auth token is required");
    }

    if (!credentials.phoneNumber && !config.messagingServiceSid) {
      throw new Error("Twilio phone number or messaging service SID is required");
    }

    this.accountSid = credentials.accountSid;
    this.authToken = credentials.authToken;
    this.fromNumber = credentials.phoneNumber || "";
    this.messagingServiceSid = config.messagingServiceSid as string | undefined;
  }

  /**
   * Send a plain text SMS
   */
  async sendText(toNumber: string, text: string): Promise<SendResult> {
    const params: Record<string, string> = {
      To: this.formatPhoneNumber(toNumber),
      Body: text,
    };

    if (this.messagingServiceSid) {
      params.MessagingServiceSid = this.messagingServiceSid;
    } else {
      params.From = this.fromNumber;
    }

    return this.sendMessage(params);
  }

  /**
   * Send a message with buttons (formatted as text options)
   * SMS doesn't support native buttons, so we format them as numbered options
   */
  async sendButtons(
    toNumber: string,
    text: string,
    buttons: Button[]
  ): Promise<SendResult> {
    // Format buttons as numbered options
    const buttonText = buttons
      .map((btn, index) => `${index + 1}. ${btn.label}`)
      .join("\n");

    const fullText = `${text}\n\n${buttonText}\n\nReply with the number of your choice.`;

    return this.sendText(toNumber, fullText);
  }

  /**
   * Send quick replies (same as buttons for SMS)
   */
  async sendQuickReplies(
    toNumber: string,
    text: string,
    quickReplies: Array<{ label: string; value: string }>
  ): Promise<SendResult> {
    const buttons = quickReplies.map((qr) => ({
      label: qr.label,
      value: qr.value,
      type: "reply" as const,
    }));

    return this.sendButtons(toNumber, text, buttons);
  }

  /**
   * Send MMS with media
   */
  async sendMedia(toNumber: string, media: MediaPayload): Promise<SendResult> {
    if (!media.url) {
      return {
        success: false,
        error: "Media URL is required for MMS",
      };
    }

    // Only image/video/audio are supported for MMS
    if (!["image", "video", "audio"].includes(media.type)) {
      // For documents, send as a link
      const text = media.caption
        ? `${media.caption}\n\nDownload: ${media.url}`
        : `Download file: ${media.url}`;
      return this.sendText(toNumber, text);
    }

    const params: Record<string, string> = {
      To: this.formatPhoneNumber(toNumber),
      MediaUrl: media.url,
    };

    if (media.caption) {
      params.Body = media.caption;
    }

    if (this.messagingServiceSid) {
      params.MessagingServiceSid = this.messagingServiceSid;
    } else {
      params.From = this.fromNumber;
    }

    return this.sendMessage(params);
  }

  /**
   * Send cards as formatted text messages
   */
  async sendCards(toNumber: string, cards: CardPayload[]): Promise<SendResult> {
    for (const card of cards) {
      let text = `*${card.title}*`;

      if (card.subtitle) {
        text += `\n${card.subtitle}`;
      }

      if (card.imageUrl) {
        // Send image separately via MMS
        const mediaResult = await this.sendMedia(toNumber, {
          type: "image",
          url: card.imageUrl,
          caption: text,
        });

        if (!mediaResult.success) {
          return mediaResult;
        }
      } else if (card.buttons && card.buttons.length > 0) {
        // Send text with button options
        const result = await this.sendButtons(toNumber, text, card.buttons);
        if (!result.success) {
          return result;
        }
      } else {
        const result = await this.sendText(toNumber, text);
        if (!result.success) {
          return result;
        }
      }
    }

    return { success: true };
  }

  /**
   * Get message status
   */
  async getDeliveryStatus(messageSid: string): Promise<DeliveryStatus> {
    const url = `${TWILIO_API_BASE}/Accounts/${this.accountSid}/Messages/${messageSid}.json`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64")}`,
      },
    });

    if (!response.ok) {
      return { status: "unknown" };
    }

    const data = (await response.json()) as TwilioMessageResponse;

    return {
      status: this.mapTwilioStatus(data.status),
      timestamp: data.date_sent ? new Date(data.date_sent) : undefined,
      errorCode: data.error_code?.toString(),
      errorMessage: data.error_message,
    };
  }

  /**
   * Send a template message (for approved SMS campaigns)
   */
  async sendTemplateMessage(
    toNumber: string,
    contentSid: string,
    contentVariables: Record<string, string>
  ): Promise<SendResult> {
    const params: Record<string, string> = {
      To: this.formatPhoneNumber(toNumber),
      ContentSid: contentSid,
      ContentVariables: JSON.stringify(contentVariables),
    };

    if (this.messagingServiceSid) {
      params.MessagingServiceSid = this.messagingServiceSid;
    } else {
      params.From = this.fromNumber;
    }

    return this.sendMessage(params);
  }

  /**
   * Lookup phone number info
   */
  async lookupPhoneNumber(phoneNumber: string): Promise<{
    success: boolean;
    data?: {
      phoneNumber: string;
      countryCode: string;
      carrier?: string;
      type?: string;
    };
    error?: string;
  }> {
    const formattedNumber = this.formatPhoneNumber(phoneNumber);
    const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(formattedNumber)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64")}`,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: "Phone number lookup failed",
      };
    }

    const data = (await response.json()) as {
      phone_number: string;
      country_code: string;
      carrier?: { name: string; type: string };
    };

    return {
      success: true,
      data: {
        phoneNumber: data.phone_number,
        countryCode: data.country_code,
        carrier: data.carrier?.name,
        type: data.carrier?.type,
      },
    };
  }

  /**
   * Send the message via Twilio API
   */
  private async sendMessage(
    params: Record<string, string>
  ): Promise<SendResult> {
    const url = `${TWILIO_API_BASE}/Accounts/${this.accountSid}/Messages.json`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params),
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as TwilioError;
      return {
        success: false,
        error: error.message || "Failed to send message",
        errorCode: error.code?.toString(),
      };
    }

    const messageData = data as TwilioMessageResponse;

    return {
      success: true,
      messageId: messageData.sid,
      externalId: messageData.sid,
      metadata: {
        status: messageData.status,
        numSegments: messageData.num_segments,
      },
    };
  }

  /**
   * Format phone number to E.164 format
   */
  private formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters except leading +
    let cleaned = phone.replace(/[^\d+]/g, "");

    // If no + prefix and it's a US number (10 digits), add +1
    if (!cleaned.startsWith("+")) {
      if (cleaned.length === 10) {
        cleaned = "+1" + cleaned;
      } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
        cleaned = "+" + cleaned;
      } else {
        cleaned = "+" + cleaned;
      }
    }

    return cleaned;
  }

  /**
   * Map Twilio status to our DeliveryStatus
   */
  private mapTwilioStatus(
    twilioStatus: string
  ): DeliveryStatus["status"] {
    switch (twilioStatus) {
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
}

/**
 * Create an SMS sender instance from channel credentials
 */
export function createSMSSender(
  credentials: ChannelCredentials,
  config: ChannelConfig = {}
): SMSSender {
  return new SMSSender(credentials, config);
}
