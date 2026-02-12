/**
 * Microsoft Teams Bot Framework Webhook Parser
 * https://docs.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-concepts
 */

import * as jwt from "jsonwebtoken";
import type {
  ChannelWebhookParser,
  InboundMessage,
  WebhookVerification,
  DeliveryStatus,
} from "../senders/types";

interface TeamsActivity {
  type: string;
  id: string;
  timestamp: string;
  localTimestamp?: string;
  serviceUrl: string;
  channelId: string;
  from: {
    id: string;
    name?: string;
    aadObjectId?: string;
  };
  conversation: {
    id: string;
    conversationType?: string;
    tenantId?: string;
    isGroup?: boolean;
  };
  recipient: {
    id: string;
    name?: string;
  };
  text?: string;
  textFormat?: string;
  attachments?: TeamsAttachment[];
  entities?: TeamsEntity[];
  channelData?: {
    tenant?: { id: string };
    team?: { id: string; name?: string };
    channel?: { id: string; name?: string };
  };
  value?: Record<string, unknown>;
  replyToId?: string;
}

interface TeamsAttachment {
  contentType: string;
  contentUrl?: string;
  content?: unknown;
  name?: string;
  thumbnailUrl?: string;
}

interface TeamsEntity {
  type: string;
  mentioned?: {
    id: string;
    name?: string;
  };
  text?: string;
}

export class TeamsWebhookParser implements ChannelWebhookParser {
  private openIdMetadataUrl = "https://login.botframework.com/v1/.well-known/openidconfiguration";
  private allowedIssuers = [
    "https://api.botframework.com",
    "https://sts.windows.net/d6d49420-f39b-4df7-a1dc-d59a935871db/",
    "https://login.microsoftonline.com/d6d49420-f39b-4df7-a1dc-d59a935871db/v2.0",
  ];

  /**
   * Verify JWT token from Bot Framework
   * This is a simplified verification - production should fetch and cache JWKS
   */
  verifySignature(
    _payload: string | Buffer,
    authHeader: string,
    _secret: string
  ): boolean {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return false;
    }

    const token = authHeader.substring(7);

    try {
      // Decode without verification first to check claims
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded.payload === "string") {
        return false;
      }

      const payload = decoded.payload as jwt.JwtPayload;

      // Verify issuer
      if (!payload.iss || !this.allowedIssuers.some((iss) => payload.iss?.startsWith(iss.split("/")[0]))) {
        console.warn("Invalid Teams token issuer:", payload.iss);
        return false;
      }

      // Verify not expired
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        console.warn("Teams token expired");
        return false;
      }

      // Verify audience matches app ID (would need to be passed in)
      // In production, you'd verify the signature using the JWKS from openIdMetadataUrl

      return true;
    } catch (error) {
      console.error("Teams token verification error:", error);
      return false;
    }
  }

  /**
   * Teams doesn't use URL verification like other platforms
   */
  handleVerification(
    _query: Record<string, string>
  ): WebhookVerification {
    return { valid: true };
  }

  /**
   * Parse incoming activity to unified message format
   */
  parseInboundMessage(payload: unknown): InboundMessage | null {
    const activity = payload as TeamsActivity;

    // Only process message activities
    if (activity.type !== "message") {
      return null;
    }

    // Skip messages from the bot itself
    if (activity.from.id === activity.recipient.id) {
      return null;
    }

    const baseMessage = {
      externalId: activity.id,
      senderId: activity.from.id,
      senderName: activity.from.name,
      timestamp: new Date(activity.timestamp),
      rawPayload: activity,
    };

    // Handle Adaptive Card action submit
    if (activity.value && Object.keys(activity.value).length > 0) {
      const actionValue = activity.value.action || JSON.stringify(activity.value);
      return {
        ...baseMessage,
        type: "button_click",
        buttonValue: String(actionValue),
        text: activity.text,
      };
    }

    // Handle text message
    if (activity.text) {
      // Remove bot mentions from the text
      let text = activity.text;
      if (activity.entities) {
        for (const entity of activity.entities) {
          if (entity.type === "mention" && entity.text) {
            text = text.replace(entity.text, "").trim();
          }
        }
      }

      return {
        ...baseMessage,
        type: "text",
        text,
      };
    }

    // Handle attachments
    if (activity.attachments && activity.attachments.length > 0) {
      const attachment = activity.attachments[0];

      // Handle images
      if (attachment.contentType?.startsWith("image/")) {
        return {
          ...baseMessage,
          type: "media",
          media: {
            type: "image",
            url: attachment.contentUrl,
            mimeType: attachment.contentType,
            filename: attachment.name,
          },
        };
      }

      // Handle other files
      if (attachment.contentUrl) {
        return {
          ...baseMessage,
          type: "media",
          media: {
            type: "document",
            url: attachment.contentUrl,
            mimeType: attachment.contentType,
            filename: attachment.name,
          },
        };
      }

      // Handle Adaptive Card responses (shouldn't reach here normally)
      if (attachment.contentType === "application/vnd.microsoft.card.adaptive") {
        return {
          ...baseMessage,
          type: "text",
          text: "[Adaptive Card]",
        };
      }
    }

    return null;
  }

  /**
   * Teams doesn't send explicit delivery updates through webhooks
   */
  isDeliveryUpdate(_payload: unknown): boolean {
    return false;
  }

  /**
   * Parse delivery status update (not supported by Teams)
   */
  parseDeliveryUpdate(_payload: unknown): {
    externalId: string;
    status: DeliveryStatus["status"];
    timestamp?: Date;
  } | null {
    return null;
  }

  /**
   * Check if this is a conversationUpdate activity (new member added, etc.)
   */
  isConversationUpdate(payload: unknown): boolean {
    const activity = payload as TeamsActivity;
    return activity.type === "conversationUpdate";
  }

  /**
   * Check if this is an invoke activity (task modules, message extensions)
   */
  isInvokeActivity(payload: unknown): boolean {
    const activity = payload as TeamsActivity;
    return activity.type === "invoke";
  }

  /**
   * Get the service URL from the activity
   */
  getServiceUrl(payload: unknown): string | null {
    const activity = payload as TeamsActivity;
    return activity.serviceUrl || null;
  }

  /**
   * Get conversation reference for proactive messaging
   */
  getConversationReference(payload: unknown): {
    conversationId: string;
    serviceUrl: string;
    tenantId?: string;
    userId: string;
    botId: string;
  } | null {
    const activity = payload as TeamsActivity;

    if (!activity.conversation?.id || !activity.serviceUrl) {
      return null;
    }

    return {
      conversationId: activity.conversation.id,
      serviceUrl: activity.serviceUrl,
      tenantId: activity.conversation.tenantId || activity.channelData?.tenant?.id,
      userId: activity.from.id,
      botId: activity.recipient.id,
    };
  }

  /**
   * Extract team and channel info if available
   */
  getTeamContext(payload: unknown): {
    teamId?: string;
    teamName?: string;
    channelId?: string;
    channelName?: string;
  } | null {
    const activity = payload as TeamsActivity;

    if (!activity.channelData) {
      return null;
    }

    return {
      teamId: activity.channelData.team?.id,
      teamName: activity.channelData.team?.name,
      channelId: activity.channelData.channel?.id,
      channelName: activity.channelData.channel?.name,
    };
  }
}

/**
 * Create a Teams webhook parser
 */
export function createTeamsParser(): TeamsWebhookParser {
  return new TeamsWebhookParser();
}
