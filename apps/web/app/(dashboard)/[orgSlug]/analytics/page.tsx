import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getOrganizationBySlug } from "@/lib/organization";
import { hasPermission, Permission } from "@/lib/permissions";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export const metadata = {
  title: "Analytics",
};

export default async function AnalyticsPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const { organization, membership } = await getOrganizationBySlug(orgSlug, session.user.id);

  if (!organization || !membership) {
    notFound();
  }

  if (!hasPermission(membership.role, Permission.ANALYTICS_VIEW)) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Analytics
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Conversation analytics</h1>
        <p className="text-muted-foreground max-w-3xl">
          Track conversations, messages, knowledge base usage, and satisfaction
          metrics across your organization. Export reports or schedule recurring
          digests for your team.
        </p>
      </div>
      <AnalyticsDashboard organizationId={organization.id} />
    </div>
  );
}
