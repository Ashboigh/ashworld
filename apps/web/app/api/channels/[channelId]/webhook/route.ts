/**
 * Channel Webhook Handler
 * Receives incoming messages from external channels and routes them to chatbot
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { createChannelParser, hasParserImplementation } from "@/lib/channels/parsers";
import { createChannelSender, hasSenderImplementation } from "@/lib/channels/senders";
import type { ChannelType } from "@/lib/chatbot/types";
import type { InboundMessage, SendResult } from "@/lib/channels/senders/types";

interface RouteParams {
  params: Promise<{ channelId: string }>;
}

/**
 * GET - Handle webhook verification (WhatsApp, Messenger)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { channelId } = await params;

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        chatbot: {
          select: { id: true, workspaceId: true },
        },
      },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const channelType = channel.type as ChannelType;

    // Check if we have a parser for this channel
    if (!hasParserImplementation(channelType)) {
      return NextResponse.json(
        { error: "Channel type not supported" },
        { status: 501 }
      );
    }

    const parser = createChannelParser(channelType);

    // Handle verification if parser supports it
    if (parser.handleVerification) {
      const query: Record<string, string> = {};
      request.nextUrl.searchParams.forEach((value, key) => {
        query[key] = value;
      });

      const verification = parser.handleVerification(query);

      if (verification.valid && verification.challenge) {
        // Return the challenge for WhatsApp/Messenger verification
        return new NextResponse(verification.challenge, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      }

      if (!verification.valid) {
        return NextResponse.json(
          { error: verification.error || "Verification failed" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Channel webhook verification error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}

/**
 * POST - Handle incoming messages
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { channelId } = await params;

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        chatbot: {
          include: {
            workspace: {
              select: { id: true, organizationId: true },
            },
          },
        },
      },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    if (channel.status !== "active") {
      // Channel is not active, acknowledge but don't process
      return NextResponse.json({ status: "inactive" });
    }

    const channelType = channel.type as ChannelType;
    const credentials = channel.credentials as Record<string, string>;
    const config = channel.config as Record<string, unknown>;

    // Check if we have implementations for this channel
    if (!hasParserImplementation(channelType)) {
      console.log(`Parser not implemented for channel type: ${channelType}`);
      return NextResponse.json({ status: "unsupported" });
    }

    const parser = createChannelParser(channelType);

    // Get raw body for signature verification
    const rawBody = await request.text();
    let payload: unknown;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Verify webhook signature
    const signatureHeader = getSignatureHeader(channelType, request.headers);

    if (signatureHeader && channel.webhookSecret) {
      const isValid = parser.verifySignature(
        rawBody,
        signatureHeader,
        channel.webhookSecret
      );

      if (!isValid) {
        console.warn(`Invalid webhook signature for channel ${channelId}`);
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 403 }
        );
      }
    }

    // Check if this is a delivery status update
    if (parser.isDeliveryUpdate && parser.isDeliveryUpdate(payload)) {
      const deliveryUpdate = parser.parseDeliveryUpdate?.(payload);

      if (deliveryUpdate) {
        // Update message delivery status in database
        await updateDeliveryStatus(deliveryUpdate);
      }

      return NextResponse.json({ status: "delivery_update_processed" });
    }

    // Parse the inbound message
    const inboundMessage = parser.parseInboundMessage(payload);

    if (!inboundMessage) {
      // Not a message event (could be typing indicator, etc.)
      return NextResponse.json({ status: "no_message" });
    }

    // Process the message through the chatbot
    const response = await processChannelMessage(
      channel,
      inboundMessage,
      credentials,
      config
    );

    // Handle Telegram callback query acknowledgment
    if (channelType === "telegram" && inboundMessage.type === "button_click") {
      const telegramParser = parser as import("@/lib/channels/parsers/telegram").TelegramWebhookParser;
      const callbackQueryId = telegramParser.getCallbackQueryId(payload);

      if (callbackQueryId && hasSenderImplementation(channelType)) {
        const sender = createChannelSender(channelType, credentials, config) as import("@/lib/channels/senders/telegram").TelegramSender;
        await sender.answerCallbackQuery(callbackQueryId);
      }
    }

    return NextResponse.json({
      status: "processed",
      messageId: response?.messageId,
    });
  } catch (error) {
    console.error("Channel webhook error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

/**
 * Get the signature header based on channel type
 */
function getSignatureHeader(
  channelType: ChannelType,
  headers: Headers
): string | null {
  switch (channelType) {
    case "telegram":
      return headers.get("x-telegram-bot-api-secret-token");
    case "whatsapp":
    case "messenger":
      return headers.get("x-hub-signature-256");
    case "slack":
      return headers.get("x-slack-signature");
    case "teams":
      return headers.get("authorization");
    case "sms":
      return headers.get("x-twilio-signature");
    default:
      return headers.get("x-channel-secret");
  }
}

/**
 * Process an incoming channel message through the chatbot
 */
async function processChannelMessage(
  channel: {
    id: string;
    type: string;
    chatbotId: string;
    credentials: unknown;
    config: unknown;
    chatbot: {
      id: string;
      workspaceId: string;
      workspace: {
        id: string;
        organizationId: string;
      } | null;
    };
  },
  message: InboundMessage,
  credentials: Record<string, string>,
  config: Record<string, unknown>
): Promise<SendResult | null> {
  const channelType = channel.type as ChannelType;

  // Find or create conversation for this sender
  let conversation = await prisma.conversation.findFirst({
    where: {
      chatbotId: channel.chatbotId,
      channelId: channel.id,
      metadata: {
        path: ["externalSenderId"],
        equals: message.senderId,
      },
      status: { not: "closed" },
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 50,
      },
    },
  });

  if (!conversation) {
    // Create new conversation
    const sessionId = `channel_${channel.id}_${message.senderId}_${Date.now()}`;

    conversation = await prisma.conversation.create({
      data: {
        chatbotId: channel.chatbotId,
        channelId: channel.id,
        sessionId,
        status: "active",
        metadata: {
          externalSenderId: message.senderId,
          senderName: message.senderName,
          channelType: channel.type,
        },
        context: {},
      },
      include: {
        messages: true,
      },
    });
  }

  // Save the incoming message
  const userMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: message.text || message.buttonValue || "[Media/Location]",
      metadata: {
        externalId: message.externalId,
        type: message.type,
        media: message.media,
        location: message.location,
      },
    },
  });

  // Update conversation last message time
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });

  // Process the message through the chat API
  // We call the internal message processing logic
  const chatResponse = await processMessage(
    channel.chatbotId,
    conversation.sessionId,
    message.text || message.buttonValue || ""
  );

  // If we have a response and a sender implementation, send it
  if (chatResponse && chatResponse.messages && chatResponse.messages.length > 0) {
    if (!hasSenderImplementation(channelType)) {
      console.log(`Sender not implemented for channel type: ${channelType}`);
      return null;
    }

    const sender = createChannelSender(channelType, credentials, config);

    // Send each response message
    for (const responseMessage of chatResponse.messages) {
      let result: SendResult;

      if (responseMessage.buttons && responseMessage.buttons.length > 0) {
        result = await sender.sendButtons(
          message.senderId,
          responseMessage.content,
          responseMessage.buttons.map((btn: { label: string; value: string }) => ({
            label: btn.label,
            value: btn.value,
          }))
        );
      } else {
        result = await sender.sendText(message.senderId, responseMessage.content);
      }

      if (!result.success) {
        console.error(`Failed to send message to ${channelType}:`, result.error);
      }

      // Save the outgoing message
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          content: responseMessage.content,
          metadata: {
            externalId: result.externalId,
            channelType: channel.type,
            sent: result.success,
            error: result.error,
          },
        },
      });

      return result;
    }
  }

  return null;
}

/**
 * Process message through internal chat API
 */
async function processMessage(
  chatbotId: string,
  sessionId: string,
  message: string
): Promise<{
  messages: Array<{
    role: string;
    content: string;
    type?: string;
    buttons?: Array<{ label: string; value: string }>;
  }>;
  status: string;
} | null> {
  try {
    // Call the internal message API
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ||
                    process.env.NEXT_PUBLIC_APP_URL ||
                    "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/chat/${chatbotId}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        message,
      }),
    });

    if (!response.ok) {
      console.error("Internal message API error:", response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error calling internal message API:", error);
    return null;
  }
}

/**
 * Update delivery status in database
 */
async function updateDeliveryStatus(update: {
  externalId: string;
  status: string;
  timestamp?: Date;
  errorCode?: string;
  errorMessage?: string;
}): Promise<void> {
  try {
    // Find message by external ID in metadata
    const message = await prisma.message.findFirst({
      where: {
        metadata: {
          path: ["externalId"],
          equals: update.externalId,
        },
      },
    });

    if (message) {
      // Update message metadata with delivery status
      const currentMetadata = (message.metadata as Record<string, unknown>) || {};

      await prisma.message.update({
        where: { id: message.id },
        data: {
          metadata: {
            ...currentMetadata,
            deliveryStatus: update.status,
            deliveryTimestamp: update.timestamp?.toISOString(),
            deliveryError: update.errorCode
              ? { code: update.errorCode, message: update.errorMessage }
              : undefined,
          },
        },
      });
    }
  } catch (error) {
    console.error("Error updating delivery status:", error);
  }
}
