import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { createChatbotSchema } from "@/lib/validations/chatbot";
import { hasPermission, Permission, OrgRoleType } from "@/lib/permissions";
import { checkOrganizationLimit } from "@/lib/billing";
import { AMALENA_PLUGIN_TEMPLATE } from "@/lib/workflow/templates/amalena";

interface RouteParams {
  params: Promise<{ workspaceId: string }>;
}

async function ensureAmalenaDefaultWorkflow(workspaceId: string) {
  const template = AMALENA_PLUGIN_TEMPLATE;
  const existing = await prisma.workflow.findFirst({
    where: { workspaceId, name: template.name },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  const workflow = await prisma.workflow.create({
    data: {
      workspaceId,
      name: template.name,
      description: template.description,
      status: "published",
      triggerType: template.triggerType,
      isDefault: template.isDefault ?? false,
      version: 1,
      publishedAt: new Date(),
      nodes: {
        create: template.nodes.map((node) => ({
          nodeId: node.nodeId,
          type: node.type,
          positionX: node.positionX,
          positionY: node.positionY,
          config: node.config,
        })),
      },
      edges: {
        create: template.edges.map((edge) => ({
          edgeId: edge.edgeId,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          label: edge.label,
        })),
      },
      variables: {
        create: (template.variables ?? []).map((variable) => ({
          name: variable.name,
          type: variable.type,
          defaultValue: variable.defaultValue,
          description: variable.description,
        })),
      },
    },
  });

  return workflow.id;
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

// GET /api/workspaces/[workspaceId]/chatbots
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId } = await params;
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

    const chatbots = await prisma.chatbot.findMany({
      where: { workspaceId },
      include: {
        _count: {
          select: {
            conversations: true,
            channels: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Get active conversations count for each chatbot
    const chatbotsWithStats = await Promise.all(
      chatbots.map(async (chatbot) => {
        const activeConversations = await prisma.conversation.count({
          where: {
            chatbotId: chatbot.id,
            status: { in: ["active", "waiting_for_human"] },
          },
        });

        return {
          ...chatbot,
          conversationCount: chatbot._count.conversations,
          channelCount: chatbot._count.channels,
          activeConversations,
        };
      })
    );

    return NextResponse.json(chatbotsWithStats);
  } catch (error) {
    console.error("Error fetching chatbots:", error);
    return NextResponse.json(
      { error: "Failed to fetch chatbots" },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/[workspaceId]/chatbots
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getWorkspaceAccess(workspaceId, session.user.id);

    if (!access || !hasPermission(access.role, Permission.CHATBOT_CREATE)) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    // Check chatbot limit
    const limitCheck = await checkOrganizationLimit(
      access.workspace.organizationId,
      "chatbots"
    );
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: "Chatbot limit reached",
          code: "LIMIT_EXCEEDED",
          details: {
            resource: "chatbots",
            current: limitCheck.currentUsage,
            limit: limitCheck.limit,
            message: limitCheck.upgradeMessage,
          },
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = createChatbotSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const data = result.data;
    let defaultWorkflowId = data.defaultWorkflowId;
    if (!defaultWorkflowId) {
      defaultWorkflowId = await ensureAmalenaDefaultWorkflow(workspaceId);
    }

    // Create chatbot
    const chatbot = await prisma.chatbot.create({
      data: {
        workspaceId,
        name: data.name,
        description: data.description,
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
        widgetConfig: data.widgetConfig || {},
        defaultWorkflowId,
      },
      include: {
        _count: {
          select: {
            conversations: true,
            channels: true,
          },
        },
      },
    });

    return NextResponse.json(chatbot, { status: 201 });
  } catch (error) {
    console.error("Error creating chatbot:", error);
    return NextResponse.json(
      { error: "Failed to create chatbot" },
      { status: 500 }
    );
  }
}
