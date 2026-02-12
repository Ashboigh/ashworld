import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { hasPermission, Permission, type OrgRoleType } from "@/lib/permissions";
import { queueHumanHandoff } from "@/lib/live-chat/service";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId } = body;
    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
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

    const result = await queueHumanHandoff({
      conversationId,
      priority: body.priority,
      tags: body.tags,
      message: body.message,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Human handoff error:", error);
    return NextResponse.json(
      { error: "Failed to queue human handoff" },
      { status: 500 }
    );
  }
}
