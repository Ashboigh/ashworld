import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";

interface PageProps {
  params: Promise<{
    orgSlug: string;
    conversationId: string;
  }>;
}

export default async function ConversationRedirectPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { orgSlug, conversationId } = await params;

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      organization: {
        slug: orgSlug,
      },
    },
    select: {
      organizationId: true,
      role: true,
    },
  });

  if (!membership) {
    notFound();
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      chatbotId: true,
      chatbot: {
        select: {
          workspace: {
            select: {
              organizationId: true,
              members: {
                where: { userId: session.user.id },
                select: { role: true },
              },
            },
          },
        },
      },
    },
  });

  if (!conversation) {
    notFound();
  }

  if (conversation.chatbot.workspace.organizationId !== membership.organizationId) {
    notFound();
  }

  const orgRole = membership.role as string;
  const hasOrgWideAccess = orgRole === "org_admin" || orgRole === "workspace_admin";
  if (!hasOrgWideAccess && conversation.chatbot.workspace.members.length === 0) {
    notFound();
  }

  redirect(`/${orgSlug}/chatbots/${conversation.chatbotId}/conversations/${conversation.id}`);
}

