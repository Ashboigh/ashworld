import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { z } from "zod";
import { recordAnalyticsEvent } from "@/lib/analytics/events";
import { chatApiCorsPreflight, withChatApiCors } from "@/lib/network/cors";

const feedbackSchema = z.object({
  sessionId: z.string().min(1),
  messageId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(1000).optional(),
});

/**
 * POST /api/chat/[chatbotId]/feedback
 * Submit feedback for a message
 * Public endpoint - no authentication required
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params;
    const body = await request.json();

    // Validate input
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      return withChatApiCors(NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      ));
    }

    const { sessionId, messageId, rating, text } = parsed.data;

    // Get conversation to verify session
    const conversation = await prisma.conversation.findUnique({
      where: { sessionId },
    });

    if (!conversation) {
      return withChatApiCors(NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      ));
    }

    if (conversation.chatbotId !== chatbotId) {
      return withChatApiCors(NextResponse.json(
        { error: "Session does not belong to this chatbot" },
        { status: 400 }
      ));
    }

    // Get message and verify it belongs to this conversation
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return withChatApiCors(NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      ));
    }

    if (message.conversationId !== conversation.id) {
      return withChatApiCors(NextResponse.json(
        { error: "Message does not belong to this conversation" },
        { status: 400 }
      ));
    }

    // Only allow feedback on assistant messages
    if (message.role !== "assistant") {
      return withChatApiCors(NextResponse.json(
        { error: "Feedback can only be provided for assistant messages" },
        { status: 400 }
      ));
    }

    // Update message with feedback
    await prisma.message.update({
      where: { id: messageId },
      data: {
        feedbackRating: rating,
        feedbackText: text || null,
      },
    });

    const conversationWithChatbot = await prisma.conversation.findUnique({
      where: { id: message.conversationId },
      include: {
        chatbot: {
          include: {
            workspace: {
              select: { organizationId: true, id: true },
            },
          },
        },
      },
    });

    if (conversationWithChatbot?.chatbot?.workspace?.organizationId) {
      await recordAnalyticsEvent({
        organizationId: conversationWithChatbot.chatbot.workspace.organizationId,
        workspaceId: conversationWithChatbot.chatbot.workspace.id,
        chatbotId: conversationWithChatbot.chatbot.id,
        conversationId: conversationWithChatbot.id,
        eventType: "message.feedback",
        payload: {
          messageId,
          rating,
          text: text || null,
        },
      });
    }

    return withChatApiCors(NextResponse.json({
      success: true,
      message: "Feedback submitted successfully",
    }));
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return withChatApiCors(NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    ));
  }
}

export function OPTIONS(request: NextRequest) {
  return chatApiCorsPreflight(request);
}
