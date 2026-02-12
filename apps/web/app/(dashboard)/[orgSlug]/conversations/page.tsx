import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { ConversationList } from "@/components/conversation";

interface PageProps {
  params: Promise<{
    orgSlug: string;
  }>;
  searchParams: Promise<{
    status?: string;
    workspaceId?: string;
  }>;
}

export default async function GlobalConversationsPage({ params, searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { orgSlug } = await params;
  const { status, workspaceId } = await searchParams;

  // Get organization with workspaces user has access to
  const organization = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      members: {
        where: { userId: session.user.id },
      },
      workspaces: {
        include: {
          members: {
            where: { userId: session.user.id },
          },
        },
      },
    },
  });

  if (!organization || organization.members.length === 0) {
    notFound();
  }

  // Get workspaces user has access to
  const accessibleWorkspaceIds = organization.workspaces
    .filter((ws) => {
      const orgMember = organization.members[0];
      const wsMember = ws.members[0];
      return orgMember?.role === "org_admin" ||
             orgMember?.role === "workspace_admin" ||
             wsMember;
    })
    .map((ws) => ws.id);

  if (accessibleWorkspaceIds.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>You don&apos;t have access to any workspaces.</p>
      </div>
    );
  }

  // Build where clause
  const where: Record<string, unknown> = {
    chatbot: {
      workspaceId: workspaceId && accessibleWorkspaceIds.includes(workspaceId)
        ? workspaceId
        : { in: accessibleWorkspaceIds },
    },
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
      chatbot: {
        select: {
          id: true,
          name: true,
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
    chatbot: conv.chatbot,
  }));

  return (
    <div className="h-[calc(100vh-4rem)]">
      <div className="border-b p-4">
        <h1 className="text-xl font-semibold">All Conversations</h1>
        <p className="text-sm text-muted-foreground">
          View and manage conversations across all chatbots
        </p>
      </div>
      <div className="h-[calc(100%-5rem)]">
        <ConversationList
          conversations={serializedConversations}
          orgSlug={orgSlug}
        />
      </div>
    </div>
  );
}
