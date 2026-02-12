import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { hasPermission, Permission, type OrgRoleType } from "@/lib/permissions";
import { emitLiveChatEvent } from "@/lib/live-chat/events";
import { z } from "zod";

interface RouteParams {
  params: {
    conversationId: string;
  };
}

const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  internalNote: z.string().max(4000).optional(),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: params.conversationId },
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

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (conversation.status === "closed") {
      return NextResponse.json({ error: "Conversation is closed" }, { status: 400 });
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: conversation.chatbot.workspace.organizationId,
          userId: session.user.id,
        },
      },
    });

    if (!membership || !hasPermission(membership.role as OrgRoleType, Permission.LIVE_CHAT_MANAGE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!conversation.assignedToId) {
      return NextResponse.json({ error: "Conversation is not assigned" }, { status: 409 });
    }

    if (conversation.assignedToId !== session.user.id) {
      return NextResponse.json(
        { error: "Conversation is assigned to another agent" },
        { status: 409 }
      );
    }

    const now = new Date();
    const shouldSetFirstResponse = conversation.firstResponseTimeMs == null;
    const firstResponseTimeMs = now.getTime() - conversation.createdAt.getTime();

    const { message } = await prisma.$transaction(async (tx) => {
      const createdMessage = await tx.message.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          content: parsed.data.content,
          metadata: {},
          isFromAgent: true,
          agentId: session.user.id,
          internalNote: parsed.data.internalNote ?? null,
        },
        include: {
          agent: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      });

      await tx.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: now,
          ...(shouldSetFirstResponse ? { firstResponseTimeMs } : {}),
        },
      });

      return { message: createdMessage };
    });

    emitLiveChatEvent({
      type: "conversation.message",
      payload: {
        organizationId: conversation.chatbot.workspace.organizationId,
        conversationId: conversation.id,
        message: {
          id: message.id,
          role: message.role,
          content: message.content,
          nodeId: message.nodeId,
          aiModel: message.aiModel,
          tokenCount: message.tokenCount,
          latencyMs: message.latencyMs,
          feedbackRating: message.feedbackRating,
          feedbackText: message.feedbackText,
          metadata: message.metadata,
          isFromAgent: message.isFromAgent,
          agentId: message.agentId,
          internalNote: message.internalNote,
          agent: message.agent,
          createdAt: message.createdAt.toISOString(),
        },
      },
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Agent message send error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
