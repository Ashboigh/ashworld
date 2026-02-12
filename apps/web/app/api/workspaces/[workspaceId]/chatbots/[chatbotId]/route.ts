import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { updateChatbotSchema } from "@/lib/validations/chatbot";
import { hasPermission, Permission } from "@/lib/permissions";
import { getWorkspaceAccess } from "@/lib/workspace-access";

interface RouteParams {
  params: Promise<{ workspaceId: string; chatbotId: string }>;
}

// GET /api/workspaces/[workspaceId]/chatbots/[chatbotId]
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId, chatbotId } = await params;
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

    const chatbot = await prisma.chatbot.findFirst({
      where: {
        id: chatbotId,
        workspaceId,
      },
      include: {
        channels: {
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            conversations: true,
            channels: true,
          },
        },
      },
    });

    if (!chatbot) {
      return NextResponse.json(
        { error: "Chatbot not found" },
        { status: 404 }
      );
    }

    // Get active conversations count
    const activeConversations = await prisma.conversation.count({
      where: {
        chatbotId: chatbot.id,
        status: { in: ["active", "waiting_for_human"] },
      },
    });

    return NextResponse.json({
      ...chatbot,
      conversationCount: chatbot._count.conversations,
      channelCount: chatbot._count.channels,
      activeConversations,
    });
  } catch (error) {
    console.error("Error fetching chatbot:", error);
    return NextResponse.json(
      { error: "Failed to fetch chatbot" },
      { status: 500 }
    );
  }
}

// PUT /api/workspaces/[workspaceId]/chatbots/[chatbotId]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId, chatbotId } = await params;
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

    // Check if chatbot exists
    const existing = await prisma.chatbot.findFirst({
      where: {
        id: chatbotId,
        workspaceId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Chatbot not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const result = updateChatbotSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const data = result.data;

    // Update chatbot
    const chatbot = await prisma.chatbot.update({
      where: { id: chatbotId },
      data: {
        name: data.name,
        description: data.description,
        status: data.status,
        personaName: data.personaName,
        personaRole: data.personaRole,
        personaTone: data.personaTone,
        personaInstructions: data.personaInstructions,
        aiProvider: data.aiProvider,
        aiModel: data.aiModel,
        aiTemperature: data.aiTemperature,
        aiMaxTokens: data.aiMaxTokens,
        greetingMessage: data.greetingMessage,
        fallbackMessage: data.fallbackMessage,
        handoffMessage: data.handoffMessage,
        enableTypingIndicator: data.enableTypingIndicator,
        responseDelayMs: data.responseDelayMs,
        widgetConfig: data.widgetConfig,
        defaultWorkflowId: data.defaultWorkflowId,
      },
      include: {
        channels: true,
        _count: {
          select: {
            conversations: true,
            channels: true,
          },
        },
      },
    });

    return NextResponse.json(chatbot);
  } catch (error) {
    console.error("Error updating chatbot:", error);
    return NextResponse.json(
      { error: "Failed to update chatbot" },
      { status: 500 }
    );
  }
}

// DELETE /api/workspaces/[workspaceId]/chatbots/[chatbotId]
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId, chatbotId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getWorkspaceAccess(workspaceId, session.user.id);

    if (!access || !hasPermission(access.role, Permission.CHATBOT_DELETE)) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    // Check if chatbot exists
    const existing = await prisma.chatbot.findFirst({
      where: {
        id: chatbotId,
        workspaceId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Chatbot not found" },
        { status: 404 }
      );
    }

    // Delete chatbot (cascades to channels, conversations, messages)
    await prisma.chatbot.delete({
      where: { id: chatbotId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting chatbot:", error);
    return NextResponse.json(
      { error: "Failed to delete chatbot" },
      { status: 500 }
    );
  }
}
