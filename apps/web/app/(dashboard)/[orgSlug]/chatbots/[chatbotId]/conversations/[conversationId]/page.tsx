import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { hasPermission, Permission, OrgRoleType } from "@/lib/permissions";
import { ConversationDetail } from "@/components/conversation";

interface PageProps {
  params: Promise<{
    orgSlug: string;
    chatbotId: string;
    conversationId: string;
  }>;
}

export default async function ConversationDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { orgSlug, chatbotId, conversationId } = await params;

  // Get organization
  const organization = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      members: {
        where: { userId: session.user.id },
      },
    },
  });

  if (!organization || organization.members.length === 0) {
    notFound();
  }

  // Get conversation with messages and workspace access
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      chatbot: {
        include: {
          workspace: {
            include: {
              members: {
                where: { userId: session.user.id },
              },
            },
          },
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
          tokenCount: true,
          latencyMs: true,
          feedbackRating: true,
          feedbackText: true,
          createdAt: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!conversation || conversation.chatbot.id !== chatbotId) {
    notFound();
  }

  // Check permissions
  const orgMember = organization.members[0];
  const wsMember = conversation.chatbot.workspace.members[0];
  const role = (orgMember?.role === "org_admin" || orgMember?.role === "workspace_admin")
    ? orgMember.role
    : wsMember?.role || orgMember?.role;

  if (!role || !hasPermission(role as OrgRoleType, Permission.CHATBOT_VIEW)) {
    notFound();
  }

  const canManage = hasPermission(role as OrgRoleType, Permission.CHATBOT_UPDATE);

  return (
    <div className="h-[calc(100vh-4rem)]">
      <ConversationDetail
        conversation={{
          id: conversation.id,
        chatbotId: conversation.chatbotId,
        sessionId: conversation.sessionId,
        status: conversation.status,
        context: conversation.context as Record<string, unknown>,
        metadata: conversation.metadata as Record<string, unknown>,
        lastMessageAt: conversation.lastMessageAt?.toISOString() || null,
        closedAt: conversation.closedAt?.toISOString() || null,
        createdAt: conversation.createdAt.toISOString(),
        priority: conversation.priority,
        tags: conversation.tags,
        firstResponseTimeMs: conversation.firstResponseTimeMs,
        assignedTo: conversation.assignedTo
          ? {
              id: conversation.assignedTo.id,
              firstName: conversation.assignedTo.firstName,
              lastName: conversation.assignedTo.lastName,
              email: conversation.assignedTo.email,
            }
          : null,
        chatbot: {
          id: conversation.chatbot.id,
          name: conversation.chatbot.name,
          workspaceId: conversation.chatbot.workspaceId,
        },
          messages: conversation.messages.map((m) => ({
            ...m,
            createdAt: m.createdAt.toISOString(),
          })),
        }}
        orgSlug={orgSlug}
        canManage={canManage}
      />
    </div>
  );
}
