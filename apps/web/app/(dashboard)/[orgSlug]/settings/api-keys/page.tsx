import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getOrganizationBySlug } from "@/lib/organization";
import { hasPermission, Permission } from "@/lib/permissions";
import { prisma } from "@repo/database";
import { ApiKeysPanel, type ApiKeyRow } from "@/components/organization/api-keys-panel";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export const metadata = {
  title: "API Keys",
};

export default async function ApiKeysSettingsPage({ params }: PageProps) {
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

  if (!hasPermission(membership.role, Permission.ORG_VIEW_API_KEYS)) {
    notFound();
  }

  const canManage = hasPermission(
    membership.role,
    Permission.ORG_MANAGE_API_KEYS
  );

  const apiKeys = await prisma.apiKey.findMany({
    where: {
      organizationId: organization.id,
      revokedAt: null,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      ipWhitelist: true,
      expiresAt: true,
      lastUsedAt: true,
      usageCount: true,
      createdAt: true,
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const apiKeyRows: ApiKeyRow[] = apiKeys.map((key) => ({
    id: key.id,
    name: key.name,
    keyPrefix: key.keyPrefix,
    scopes: key.scopes,
    ipWhitelist: key.ipWhitelist,
    expiresAt: key.expiresAt ? key.expiresAt.toISOString() : null,
    lastUsedAt: key.lastUsedAt ? key.lastUsedAt.toISOString() : null,
    usageCount: key.usageCount,
    createdAt: key.createdAt.toISOString(),
    createdBy: {
      id: key.createdBy.id,
      firstName: key.createdBy.firstName,
      lastName: key.createdBy.lastName,
      email: key.createdBy.email,
    },
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          API Keys
        </p>
        <h1 className="text-2xl font-bold tracking-tight">API key management</h1>
        <p className="text-muted-foreground max-w-2xl">
          Create scoped API keys, monitor usage, and revoke keys instantly.
        </p>
      </div>
      <ApiKeysPanel
        organizationId={organization.id}
        canManage={canManage}
        initialKeys={apiKeyRows}
      />
    </div>
  );
}
