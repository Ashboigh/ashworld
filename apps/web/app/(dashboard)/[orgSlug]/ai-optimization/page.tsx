import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getOrganizationBySlug, getOrganizationWorkspaces } from "@/lib/organization";
import { hasPermission, Permission } from "@/lib/permissions";
import { AIOptimizationDashboard } from "@/components/ai-optimization/ai-optimization-dashboard";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export const metadata = {
  title: "AI Optimization",
};

export default async function AIOptimizationPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const { organization, membership } = await getOrganizationBySlug(orgSlug, session.user.id);

  if (!organization || !membership) {
    notFound();
  }

  if (!hasPermission(membership.role, Permission.CHATBOT_UPDATE)) {
    notFound();
  }

  const workspaces = await getOrganizationWorkspaces(organization.id, session.user.id);
  if (workspaces.length === 0) {
    return (
      <div className="space-y-2">
        <p>No workspaces available for AI optimization.</p>
      </div>
    );
  }

  const workspace = workspaces[0];

  if (!workspace) {
    return (
      <div className="space-y-2">
        <p>No workspaces available for AI optimization.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          AI optimization
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Improve prompt quality</h1>
        <p className="text-muted-foreground max-w-3xl">
          Version system prompts, run A/B tests, monitor model performance, and review
          quality issues to keep your chatbots aligned.
        </p>
      </div>
      <AIOptimizationDashboard
        organizationId={organization.id}
        workspaceId={workspace.id}
      />
    </div>
  );
}
