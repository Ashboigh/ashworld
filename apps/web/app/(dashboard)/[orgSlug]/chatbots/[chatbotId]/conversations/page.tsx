import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { hasPermission, Permission, OrgRoleType } from "@/lib/permissions";
import { ConversationList } from "@/components/conversation";

interface PageProps {
  params: Promise<{
    orgSlug: string;
    chatbotId: string;
  }>;
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function ChatbotConversationsPage({ params, searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { orgSlug, chatbotId } = await params;
  const { status } = await searchParams;

  // Get organization
  const organization = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      members: {
        where: { userId: session.user.id },
        include: { user: true },
      },
    },
  });

  if (!organization || organization.members.length === 0) {
    notFound();
  }

  // Get chatbot with workspace
  const chatbot = await prisma.chatbot.findUnique({
    where: { id: chatbotId },
    include: {
      workspace: {
        include: {
          members: {
            where: { userId: session.user.id },
          },
        },
      },
    },
  });

  if (!chatbot) {
    notFound();
  }

  // Check permissions
  const orgMember = organization.members[0];
  const wsMember = chatbot.workspace.members[0];
  const role = (orgMember?.role === "org_admin" || orgMember?.role === "workspace_admin")
    ? orgMember.role
    : wsMember?.role || orgMember?.role;

  if (!role || !hasPermission(role as OrgRoleType, Permission.CHATBOT_VIEW)) {
    notFound();
  }

  // Build where clause
  const where: Record<string, unknown> = {
    chatbotId,
  };

  if (status && status !== "all") {
    where.status = status;
  }

  // Get conversations
  const conversations = await prisma.conversation.findMany({
    where,
    include: {
      _count: {
        select: { messages: true },
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
    },
    orderBy: [
      { lastMessageAt: "desc" },
      { createdAt: "desc" },
    ],
    take: 100,
  });

  // Map conversations to serializable format
  const serializedConversations = conversations.map((conv) => ({
    id: conv.id,
    sessionId: conv.sessionId,
    status: conv.status,
    lastMessageAt: conv.lastMessageAt?.toISOString() || null,
    createdAt: conv.createdAt.toISOString(),
    _count: conv._count,
    messages: conv.messages.map((m) => ({
      content: m.content,
      role: m.role,
      createdAt: m.createdAt.toISOString(),
    })),
  }));

  return (
    <div className="h-[calc(100vh-4rem)]">
      <div className="border-b p-4">
        <h1 className="text-xl font-semibold">{chatbot.name} - Conversations</h1>
        <p className="text-sm text-muted-foreground">
          Manage and respond to customer conversations
        </p>
      </div>
      <div className="h-[calc(100%-5rem)]">
        <ConversationList
          conversations={serializedConversations}
          orgSlug={orgSlug}
          chatbotId={chatbotId}
        />
      </div>
    </div>
  );
}
