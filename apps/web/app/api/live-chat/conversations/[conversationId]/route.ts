import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { hasPermission, Permission, type OrgRoleType } from "@/lib/permissions";
import { emitLiveChatEvent } from "@/lib/live-chat/events";
import { recordAnalyticsEvent } from "@/lib/analytics/events";

interface RouteParams {
  params: {
    conversationId: string;
  };
}

const STATUSES = ["active", "waiting_for_human", "handed_off", "closed"];

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: params.conversationId },
      include: {
        chatbot: {
          select: {
            id: true,
            name: true,
            workspace: {
              select: { id: true, organizationId: true },
            },
          },
        },
        assignedTo: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            content: true,
            metadata: true,
            isFromAgent: true,
            agentId: true,
            internalNote: true,
            createdAt: true,
            agent: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: conversation.chatbot.workspace.organizationId,
          userId: session.user.id,
        },
      },
    });

    if (
      !membership ||
      !hasPermission(membership.role as OrgRoleType, Permission.LIVE_CHAT_VIEW)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Live chat conversation GET error:", error);
    return NextResponse.json(
      { error: "Failed to load conversation" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const body = await request.json();
    const data: Record<string, unknown> = {};
    const statusChange =
      typeof body.status === "string" && STATUSES.includes(body.status)
        ? (body.status as string)
        : null;

    if (typeof body.priority === "number") {
      data.priority = body.priority;
    }

    if (Array.isArray(body.tags)) {
      data.tags = body.tags.map((tag: string) => tag.trim()).filter(Boolean);
    }

    if (statusChange) {
      data.status = statusChange;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided (priority, tags, status)" },
        { status: 400 }
      );
    }

    const assignedAgentId = conversation.assignedToId;
    const shouldClearAssignment =
      statusChange === "active" || statusChange === "waiting_for_human";
    const shouldDecrementLoad =
      !!assignedAgentId &&
      conversation.status === "handed_off" &&
      !!statusChange &&
      statusChange !== "handed_off";

    const { updated, updatedAvailability } = await prisma.$transaction(async (tx) => {
      const updatedConversation = await tx.conversation.update({
        where: { id: conversation.id },
        data: {
          ...data,
          ...(shouldClearAssignment ? { assignedToId: null } : {}),
          ...(statusChange === "closed" ? { closedAt: new Date() } : {}),
        },
      });

      if (!shouldDecrementLoad || !assignedAgentId) {
        return { updated: updatedConversation, updatedAvailability: null };
      }

      const availability = await tx.agentAvailability.findUnique({
        where: { userId: assignedAgentId },
      });

      if (!availability) {
        return { updated: updatedConversation, updatedAvailability: null };
      }

      const nextCount = Math.max(0, availability.currentConversations - 1);
      const updatedAgentAvailability = await tx.agentAvailability.update({
        where: { id: availability.id },
        data: {
          currentConversations: nextCount,
        },
      });

      return { updated: updatedConversation, updatedAvailability: updatedAgentAvailability };
    });

    if (typeof data.status === "string" && data.status !== conversation.status) {
      emitLiveChatEvent({
        type: "conversation.status",
        payload: {
          organizationId: conversation.chatbot.workspace.organizationId,
          conversationId: conversation.id,
          status: data.status,
        },
      });
      if (conversation.chatbot?.workspace?.organizationId) {
        const durationMs = Date.now() - new Date(conversation.createdAt).getTime();
        const payload = {
          status: data.status,
          durationMs,
        };

        if (data.status === "waiting_for_human" || data.status === "handed_off") {
          await recordAnalyticsEvent({
            organizationId: conversation.chatbot.workspace.organizationId,
            workspaceId: conversation.chatbot.workspace.id,
            chatbotId: conversation.chatbotId,
            conversationId: conversation.id,
            eventType: "conversation.handoff",
            payload,
          });
        }

        if (data.status === "closed") {
          await recordAnalyticsEvent({
            organizationId: conversation.chatbot.workspace.organizationId,
            workspaceId: conversation.chatbot.workspace.id,
            chatbotId: conversation.chatbotId,
            conversationId: conversation.id,
            eventType: "conversation.resolved",
            payload,
          });
          await recordAnalyticsEvent({
            organizationId: conversation.chatbot.workspace.organizationId,
            workspaceId: conversation.chatbot.workspace.id,
            chatbotId: conversation.chatbotId,
            conversationId: conversation.id,
            eventType: "conversation.ended",
            payload,
          });
        }
      }
    }

    if (updatedAvailability && assignedAgentId) {
      emitLiveChatEvent({
        type: "agent.status",
        payload: {
          organizationId: conversation.chatbot.workspace.organizationId,
          agentId: assignedAgentId,
          status: updatedAvailability.status,
          currentConversations: updatedAvailability.currentConversations,
          maxConversations: updatedAvailability.maxConversations,
        },
      });
    }

    return NextResponse.json({ conversation: updated });
  } catch (error) {
    console.error("Live chat conversation update error:", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 }
    );
  }
}
