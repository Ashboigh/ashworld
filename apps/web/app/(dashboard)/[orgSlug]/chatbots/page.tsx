import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { getOrganizationBySlug } from "@/lib/organization";
import { hasPermission, Permission } from "@/lib/permissions";
import { CreateChatbotDialog } from "@/components/chatbot/create-chatbot-dialog";
import { ChatbotList } from "@/components/chatbot/chatbot-list";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ workspace?: string }>;
}

export default async function ChatbotsPage({
  params,
  searchParams,
}: PageProps) {
  const { orgSlug } = await params;
  const { workspace: workspaceSlug } = await searchParams;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { organization, membership } = await getOrganizationBySlug(
    orgSlug,
    session.user.id
  );

  if (!organization || !membership) {
    redirect("/onboarding");
  }

  if (!hasPermission(membership.role, Permission.CHATBOT_VIEW)) {
    redirect(`/${orgSlug}`);
  }

  // Get workspace - either from query param or first workspace
  let workspace;
  if (workspaceSlug) {
    workspace = await prisma.workspace.findFirst({
      where: {
        organizationId: organization.id,
        slug: workspaceSlug,
      },
    });
  }

  if (!workspace) {
    workspace = await prisma.workspace.findFirst({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "asc" },
    });
  }

  if (!workspace) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Chatbots</h1>
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground mb-4">
            Create a workspace first to manage chatbots
          </p>
          <a
            href={`/${orgSlug}/workspaces`}
            className="text-primary hover:underline"
          >
            Go to Workspaces
          </a>
        </div>
      </div>
    );
  }

  // Get all workspaces for selector
  const workspaces = await prisma.workspace.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "asc" },
  });

  // Get chatbots for current workspace with stats
  const chatbots = await prisma.chatbot.findMany({
    where: { workspaceId: workspace.id },
    include: {
      _count: {
        select: { conversations: true, channels: true },
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
        createdAt: chatbot.createdAt.toISOString(),
        updatedAt: chatbot.updatedAt.toISOString(),
      };
    })
  );

  // Get workflows for linking
  const workflows = await prisma.workflow.findMany({
    where: {
      workspaceId: workspace.id,
      status: "published",
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });

  const canCreate = hasPermission(membership.role, Permission.CHATBOT_CREATE);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Chatbots</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage AI-powered chatbots
          </p>
        </div>
        {canCreate && (
          <CreateChatbotDialog
            workspaceId={workspace.id}
            orgSlug={orgSlug}
            workflows={workflows}
          />
        )}
      </div>

      {workspaces.length > 1 && (
        <div className="mb-6">
          <label className="text-sm text-muted-foreground mr-2">
            Workspace:
          </label>
          <select
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
            defaultValue={workspace.slug}
            onChange={(e) => {
              window.location.href = `/${orgSlug}/chatbots?workspace=${e.target.value}`;
            }}
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.slug}>
                {ws.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <ChatbotList
        chatbots={chatbotsWithStats}
        workspaceId={workspace.id}
        orgSlug={orgSlug}
      />
    </div>
  );
}
