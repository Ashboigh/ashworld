import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { hasPermission, Permission, type OrgRoleType } from "@/lib/permissions";
import { emitLiveChatEvent } from "@/lib/live-chat/events";

interface RouteParams {
  params: {
    conversationId: string;
  };
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
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
              select: { organizationId: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const organizationId = conversation.chatbot.workspace.organizationId;

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

    if (conversation.assignedToId === session.user.id && conversation.status === "handed_off") {
      return NextResponse.json({ message: "Conversation already assigned" });
    }

    if (conversation.assignedToId && conversation.assignedToId !== session.user.id) {
      return NextResponse.json({ error: "Conversation already assigned" }, { status: 409 });
    }

    const currentAvailability = await prisma.agentAvailability.findUnique({
      where: { userId: session.user.id },
    });

    if (
      currentAvailability &&
      currentAvailability.currentConversations >= currentAvailability.maxConversations
    ) {
      return NextResponse.json({ error: "Agent is at capacity" }, { status: 409 });
    }

    const [, updatedAvailability] = await prisma.$transaction([
      prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          assignedToId: session.user.id,
          status: "handed_off",
        },
      }),
      prisma.agentAvailability.upsert({
        where: { userId: session.user.id },
        update: {
          currentConversations: { increment: 1 },
        },
        create: {
          userId: session.user.id,
          status: "available",
          currentConversations: 1,
        },
      }),
    ]);

    emitLiveChatEvent({
      type: "agent.assigned",
      payload: {
        organizationId,
        conversationId: conversation.id,
        agentId: session.user.id,
      },
    });

    emitLiveChatEvent({
      type: "conversation.status",
      payload: {
        organizationId,
        conversationId: conversation.id,
        status: "handed_off",
        assignedAgentId: session.user.id,
      },
    });

    emitLiveChatEvent({
      type: "agent.status",
      payload: {
        organizationId,
        agentId: session.user.id,
        status: updatedAvailability.status,
        currentConversations: updatedAvailability.currentConversations,
        maxConversations: updatedAvailability.maxConversations,
      },
    });

    return NextResponse.json({ message: "Conversation assigned" });
  } catch (error) {
    console.error("Assign conversation error:", error);
    return NextResponse.json(
      { error: "Failed to assign conversation" },
      { status: 500 }
    );
  }
}
