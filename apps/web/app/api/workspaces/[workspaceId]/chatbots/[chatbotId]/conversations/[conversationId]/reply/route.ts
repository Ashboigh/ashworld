import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { hasPermission, Permission, OrgRoleType } from "@/lib/permissions";
import { z } from "zod";

const replySchema = z.object({
  message: z.string().min(1).max(4000),
});

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

  if (!workspace) return null;

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

/**
 * POST /api/workspaces/[workspaceId]/chatbots/[chatbotId]/conversations/[conversationId]/reply
 * Send a reply as a human agent
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; chatbotId: string; conversationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, chatbotId, conversationId } = await params;

    // Check permissions
    const access = await getWorkspaceAccess(workspaceId, session.user.id);
    if (!access || !hasPermission(access.role, Permission.CHATBOT_UPDATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = replySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify conversation exists and belongs to chatbot
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.chatbotId !== chatbotId) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Only allow replies to handed off conversations
    if (conversation.status !== "handed_off") {
      return NextResponse.json(
        { error: "Can only reply to handed off conversations" },
        { status: 400 }
      );
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        conversationId,
        role: "assistant",
        content: parsed.data.message,
        metadata: {
          sentByHuman: true,
          agentId: session.user.id,
        },
      },
    });

    // Update conversation last message time
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("Error sending reply:", error);
    return NextResponse.json(
      { error: "Failed to send reply" },
      { status: 500 }
    );
  }
}
