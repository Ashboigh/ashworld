import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { conversationFiltersSchema } from "@/lib/validations/chatbot";
import { hasPermission, Permission, OrgRoleType } from "@/lib/permissions";

interface RouteParams {
  params: Promise<{ workspaceId: string; chatbotId: string }>;
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

// GET /api/workspaces/[workspaceId]/chatbots/[chatbotId]/conversations
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Verify chatbot belongs to workspace
    const chatbot = await prisma.chatbot.findFirst({
      where: {
        id: chatbotId,
        workspaceId,
      },
    });

    if (!chatbot) {
      return NextResponse.json(
        { error: "Chatbot not found" },
        { status: 404 }
      );
    }

    // Parse query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const result = conversationFiltersSchema.safeParse(searchParams);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid filters" },
        { status: 400 }
      );
    }

    const { status, channelId, from, to, page, limit } = result.data;

    // Build where clause
    const where: Record<string, unknown> = {
      chatbotId,
    };

    if (status) {
      where.status = status;
    }

    if (channelId) {
      where.channelId = channelId;
    }

    if (from || to) {
      where.createdAt = {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      };
    }

    // Get total count
    const total = await prisma.conversation.count({ where });

    // Get conversations with pagination
    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        channel: {
          select: {
            id: true,
            type: true,
            name: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            content: true,
            role: true,
            createdAt: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { lastMessageAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      conversations: conversations.map((conv) => ({
        id: conv.id,
        sessionId: conv.sessionId,
        status: conv.status,
        channel: conv.channel,
        messageCount: conv._count.messages,
        lastMessage: conv.messages[0] || null,
        metadata: conv.metadata,
        createdAt: conv.createdAt,
        lastMessageAt: conv.lastMessageAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}
