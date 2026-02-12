import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { takeoverSchema } from "@/lib/validations/chatbot";
import { hasPermission, Permission, OrgRoleType } from "@/lib/permissions";
import { emitLiveChatEvent } from "@/lib/live-chat/events";

interface RouteParams {
  params: Promise<{ workspaceId: string; chatbotId: string; conversationId: string }>;
}

async function getWorkspaceAccess(workspaceId: string, userId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      organization: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
      members: {
        where: { userId },
      },
    },
  });

  if (!workspace) {
    return null;
  }

  const orgMember = workspace.organization.members[0];
  const workspaceMember = workspace.members[0];

  if (orgMember?.role === "org_admin" || orgMember?.role === "workspace_admin") {
    return { workspace, role: orgMember.role as OrgRoleType };
  }

  if (workspaceMember) {
    return { workspace, role: workspaceMember.role as OrgRoleType };
  }

  if (orgMember) {
    return { workspace, role: orgMember.role as OrgRoleType };
  }

  return null;
}

// POST /api/workspaces/[workspaceId]/chatbots/[chatbotId]/conversations/[conversationId]/takeover
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId, chatbotId, conversationId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getWorkspaceAccess(workspaceId, session.user.id);

    if (!access || !hasPermission(access.role, Permission.CHATBOT_UPDATE)) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    // Find conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        chatbotId,
        chatbot: {
          workspaceId,
        },
      },
      include: {
        chatbot: true,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (conversation.status === "closed") {
      return NextResponse.json(
        { error: "Cannot take over a closed conversation" },
        { status: 400 }
      );
    }

    if (conversation.status === "handed_off" && conversation.assignedToId) {
      return NextResponse.json(
        { error: "Conversation is already assigned to another agent" },
        { status: 400 }
      );
    }

    // Parse optional message
    const body = await request.json().catch(() => ({}));
    const result = takeoverSchema.safeParse(body);
    const message = result.success ? result.data.message : undefined;

    // Update conversation status and assign to current user
    const organizationId = access.workspace.organizationId;

    const currentAvailability = await prisma.agentAvailability.findUnique({
      where: { userId: session.user.id },
    });

    if (
      currentAvailability &&
      currentAvailability.currentConversations >= currentAvailability.maxConversations
    ) {
      return NextResponse.json({ error: "Agent is at capacity" }, { status: 409 });
    }

    const { updatedConversation, updatedAvailability } = await prisma.$transaction(async (tx) => {
      const updated = await tx.conversation.update({
        where: { id: conversationId },
        data: {
          status: "handed_off",
          assignedToId: session.user.id,
        },
      });

      const availability = await tx.agentAvailability.upsert({
        where: { userId: session.user.id },
        update: {
          currentConversations: { increment: 1 },
        },
        create: {
          userId: session.user.id,
          status: "available",
          currentConversations: 1,
        },
      });

      return { updatedConversation: updated, updatedAvailability: availability };
    });

    emitLiveChatEvent({
      type: "agent.assigned",
      payload: {
        organizationId,
        conversationId,
        agentId: session.user.id,
      },
    });

    emitLiveChatEvent({
      type: "conversation.status",
      payload: {
        organizationId,
        conversationId,
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

    // If a message is provided, add it to the conversation
    if (message) {
      const createdMessage = await prisma.message.create({
        data: {
          conversationId,
          role: "assistant",
          content: message,
          metadata: {},
          isFromAgent: true,
          agentId: session.user.id,
        },
        include: {
          agent: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      });

      // Update last message timestamp
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      });

      emitLiveChatEvent({
        type: "conversation.message",
        payload: {
          organizationId,
          conversationId,
          message: {
            id: createdMessage.id,
            role: createdMessage.role,
            content: createdMessage.content,
            nodeId: createdMessage.nodeId,
            aiModel: createdMessage.aiModel,
            tokenCount: createdMessage.tokenCount,
            latencyMs: createdMessage.latencyMs,
            feedbackRating: createdMessage.feedbackRating,
            feedbackText: createdMessage.feedbackText,
            metadata: createdMessage.metadata,
            isFromAgent: createdMessage.isFromAgent,
            agentId: createdMessage.agentId,
            internalNote: createdMessage.internalNote,
            agent: createdMessage.agent,
            createdAt: createdMessage.createdAt.toISOString(),
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      conversation: updatedConversation,
      message: message ? "Takeover successful with message sent" : "Takeover successful",
    });
  } catch (error) {
    console.error("Error taking over conversation:", error);
    return NextResponse.json(
      { error: "Failed to take over conversation" },
      { status: 500 }
    );
  }
}
