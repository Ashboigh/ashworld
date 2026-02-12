import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getOrganizationBySlug } from "@/lib/organization";
import { hasPermission, Permission } from "@/lib/permissions";
import { LiveChatDashboard } from "@/components/live-chat/live-chat-dashboard";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export const metadata = {
  title: "Live Chat",
};

export default async function LiveChatPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const { organization, membership } = await getOrganizationBySlug(
    orgSlug,
    session.user.id
  );

  if (!organization || !membership) {
    notFound();
  }

  if (!hasPermission(membership.role, Permission.LIVE_CHAT_VIEW)) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <LiveChatDashboard organizationId={organization.id} />
    </div>
  );
}
