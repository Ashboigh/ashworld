import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { hasPermission, Permission, OrgRoleType } from "@/lib/permissions";
import { z } from "zod";
import { recordAnalyticsEvent } from "@/lib/analytics/events";

const updateConversationSchema = z.object({
  status: z.enum(["active", "waiting_for_human", "handed_off", "closed"]).optional(),
});

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

// GET /api/workspaces/[workspaceId]/chatbots/[chatbotId]/conversations/[conversationId]
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId, chatbotId, conversationId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getWorkspaceAccess(workspaceId, session.user.id);

    if (!access || !hasPermission(access.role, Permission.CHATBOT_VIEW)) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        chatbotId,
        chatbot: {
          workspaceId,
        },
      },
      include: {
        chatbot: {
          select: {
            id: true,
            name: true,
            personaName: true,
          },
        },
        channel: {
          select: {
            id: true,
            type: true,
            name: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            content: true,
            nodeId: true,
            aiModel: true,
            citations: true,
            feedbackRating: true,
            feedbackText: true,
            metadata: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    );
  }
}

// PATCH /api/workspaces/[workspaceId]/chatbots/[chatbotId]/conversations/[conversationId]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json();
    const parsed = updateConversationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        chatbotId,
        chatbot: {
          workspaceId,
        },
      },
      include: {
        chatbot: {
          select: {
            id: true,
            workspaceId: true,
            workspace: {
              select: {
                organizationId: true,
                id: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.status) {
      updateData.status = parsed.data.status;

      if (parsed.data.status === "closed") {
        updateData.closedAt = new Date();
      }
    }

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: updateData,
    });

    if (parsed.data.status === "closed" && conversation?.chatbot?.workspace?.organizationId) {
      const durationMs = Date.now() - new Date(conversation.createdAt).getTime();
      await recordAnalyticsEvent({
        organizationId: conversation.chatbot.workspace.organizationId,
        workspaceId: conversation.chatbot.workspace.id,
        chatbotId,
        conversationId,
        eventType: "conversation.resolved",
        payload: {
          durationMs,
        },
      });
      await recordAnalyticsEvent({
        organizationId: conversation.chatbot.workspace.organizationId,
        workspaceId: conversation.chatbot.workspace.id,
        chatbotId,
        conversationId,
        eventType: "conversation.ended",
        payload: {
          durationMs,
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating conversation:", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 }
    );
  }
}

// DELETE /api/workspaces/[workspaceId]/chatbots/[chatbotId]/conversations/[conversationId]
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        chatbotId,
        chatbot: {
          workspaceId,
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
