import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { recordAnalyticsEvent } from "@/lib/analytics/events";
import { z } from "zod";
import { chatApiCorsPreflight, withChatApiCors } from "@/lib/network/cors";

const widgetEventSchema = z.object({
  eventType: z.enum(["widget.opened", "widget.closed"]),
  sessionId: z.string().optional(),
  conversationId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  const { chatbotId } = await params;

  const body = await request.json();
  const parsed = widgetEventSchema.safeParse(body);
  if (!parsed.success) {
    return withChatApiCors(NextResponse.json(
      { error: "Invalid widget event payload", details: parsed.error.flatten() },
      { status: 400 }
    ));
  }

  const chatbot = await prisma.chatbot.findUnique({
    where: { id: chatbotId },
    include: {
      workspace: true,
    },
  });

  if (!chatbot || !chatbot.workspace?.organizationId) {
    return withChatApiCors(NextResponse.json(
      { error: "Chatbot or workspace not found" },
      { status: 404 }
    ));
  }

  await recordAnalyticsEvent({
    organizationId: chatbot.workspace.organizationId,
    workspaceId: chatbot.workspace.id,
    chatbotId,
    conversationId: parsed.data.conversationId ?? null,
    eventType: parsed.data.eventType,
    payload: {
      sessionId: parsed.data.sessionId ?? null,
      metadata: parsed.data.metadata ?? {},
    },
  });

  return withChatApiCors(NextResponse.json({ success: true }));
}

export function OPTIONS(request: NextRequest) {
  return chatApiCorsPreflight(request);
}
