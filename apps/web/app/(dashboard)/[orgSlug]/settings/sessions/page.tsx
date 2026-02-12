import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getOrganizationBySlug } from "@/lib/organization";
import { hasPermission, Permission } from "@/lib/permissions";
import { prisma } from "@repo/database";
import { SessionsPanel, type SessionRow } from "@/components/organization/sessions-panel";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export const metadata = {
  title: "Session Management",
};

export default async function SessionsSettingsPage({ params }: PageProps) {
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

  if (!hasPermission(membership.role, Permission.ORG_MANAGE_SESSIONS)) {
    notFound();
  }

  const sessions = await prisma.userSession.findMany({
    where: {
      user: {
        organizationMembers: {
          some: { organizationId: organization.id },
        },
      },
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { lastActiveAt: "desc" },
  });

  const sessionRows: SessionRow[] = sessions.map((item) => ({
    id: item.id,
    userId: item.user.id,
    userEmail: item.user.email,
    userName:
      [item.user.firstName, item.user.lastName].filter(Boolean).join(" ") || null,
    ipAddress: item.ipAddress,
    userAgent: item.userAgent,
    deviceInfo: item.deviceInfo ? JSON.stringify(item.deviceInfo) : null,
    lastActiveAt: item.lastActiveAt.toISOString(),
    createdAt: item.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Sessions
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Session management</h1>
        <p className="text-muted-foreground max-w-2xl">
          View and revoke active sessions for every member of this organization.
        </p>
      </div>
      <SessionsPanel
        organizationId={organization.id}
        canManage={hasPermission(membership.role, Permission.ORG_MANAGE_SESSIONS)}
        initialSessions={sessionRows}
      />
    </div>
  );
}
