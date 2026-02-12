import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { getOrganizationBySlug } from "@/lib/organization";
import { hasPermission, Permission } from "@/lib/permissions";
import { ChatbotSettingsTabs } from "@/components/chatbot/chatbot-settings-tabs";

interface PageProps {
  params: Promise<{ orgSlug: string; chatbotId: string }>;
}

export default async function ChatbotSettingsPage({ params }: PageProps) {
  const { orgSlug, chatbotId } = await params;
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

  // Get chatbot with related data
  const chatbot = await prisma.chatbot.findFirst({
    where: {
      id: chatbotId,
      workspace: {
        organizationId: organization.id,
      },
    },
    include: {
      workspace: true,
      channels: true,
      _count: {
        select: {
          conversations: true,
          channels: true,
        },
      },
    },
  });

  if (!chatbot) {
    notFound();
  }

  // Get workflows for linking
  const workflows = await prisma.workflow.findMany({
    where: {
      workspaceId: chatbot.workspaceId,
      status: "published",
    },
    select: {
      id: true,
      name: true,
      description: true,
    },
    orderBy: { name: "asc" },
  });

  // Get knowledge bases for AI nodes
  const knowledgeBases = await prisma.knowledgeBase.findMany({
    where: {
      workspaceId: chatbot.workspaceId,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });

  const canEdit = hasPermission(membership.role, Permission.CHATBOT_UPDATE);

  return (
    <div className="p-6">
      <ChatbotSettingsTabs
        chatbot={{
          ...chatbot,
          createdAt: chatbot.createdAt.toISOString(),
          updatedAt: chatbot.updatedAt.toISOString(),
        }}
        workflows={workflows}
        knowledgeBases={knowledgeBases}
        orgSlug={orgSlug}
        canEdit={canEdit}
      />
    </div>
  );
}
