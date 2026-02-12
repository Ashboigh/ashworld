import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getOrganizationBySlug } from "@/lib/organization";
import { hasPermission, Permission } from "@/lib/permissions";
import { AuditLogsPanel } from "@/components/organization/audit-logs-panel";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export const metadata = {
  title: "Audit Logs",
};

export default async function AuditLogsPage({ params }: PageProps) {
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

  if (!hasPermission(membership.role, Permission.ORG_VIEW_AUDIT_LOGS)) {
    notFound();
  }

  const canExport = hasPermission(
    membership.role,
    Permission.ORG_EXPORT_AUDIT_LOGS
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Audit logs
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Audit trail</h1>
        <p className="text-muted-foreground max-w-2xl">
          Review login/logout events, configuration changes, and security updates.
        </p>
      </div>
      <AuditLogsPanel
        organizationId={organization.id}
        canExport={canExport}
      />
    </div>
  );
}
