import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { getOrganizationBySlug } from "@/lib/organization";
import { hasPermission, Permission } from "@/lib/permissions";
import { ChannelManagementPanel } from "@/components/channel";
import type { ChannelType } from "@/lib/chatbot/types";

interface PageProps {
  params: Promise<{
    orgSlug: string;
    chatbotId: string;
  }>;
}

export default async function ChatbotChannelsPage({ params }: PageProps) {
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

  const chatbot = await prisma.chatbot.findFirst({
    where: {
      id: chatbotId,
      workspace: {
        organizationId: organization.id,
      },
    },
    select: {
      id: true,
      workspaceId: true,
    },
  });

  if (!chatbot) {
    notFound();
  }

  const channels = await prisma.channel.findMany({
    where: { chatbotId: chatbot.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      webhookUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const sanitizedChannels = channels.map((channel) => ({
    ...channel,
    type: channel.type as ChannelType,
    createdAt: channel.createdAt.toISOString(),
    updatedAt: channel.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Channels</h1>
        <p className="text-sm text-muted-foreground">
          Deploy your chatbot across every channel from one place.
        </p>
      </div>
      <ChannelManagementPanel
        workspaceId={chatbot.workspaceId}
        chatbotId={chatbot.id}
        channels={sanitizedChannels}
      />
    </div>
  );
}
