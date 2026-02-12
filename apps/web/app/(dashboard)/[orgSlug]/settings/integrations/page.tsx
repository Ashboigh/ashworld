import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getOrganizationBySlug } from "@/lib/organization";
import { hasPermission, Permission } from "@/lib/permissions";
import { IntegrationMarketplace } from "@/components/organization/integration-marketplace";
import { integrationProviders } from "@/lib/integrations/providers";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export const metadata = {
  title: "Integrations",
};

export default async function IntegrationsPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const { organization, membership } = await getOrganizationBySlug(orgSlug, session.user.id);

  if (!organization || !membership) {
    notFound();
  }

  if (!hasPermission(membership.role, Permission.ORG_UPDATE)) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Integrations
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          Connect third-party systems
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Register CRMs, help desks, calendars, and automation services for workflows,
          webhooks, and notifications.
        </p>
      </div>

      <IntegrationMarketplace
        providers={integrationProviders}
        organizationId={organization.id}
      />
    </div>
  );
}
