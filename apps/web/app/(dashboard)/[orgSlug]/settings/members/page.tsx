import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import {
  getOrganizationBySlug,
  getOrganizationMembers,
} from "@/lib/organization";
import { prisma } from "@repo/database";
import { hasPermission, Permission } from "@/lib/permissions";
import { MembersTable } from "@/components/organization/members-table";
import { InviteMemberDialog } from "@/components/organization/invite-member-dialog";
import { PendingInvitations } from "@/components/organization/pending-invitations";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export const metadata = {
  title: "Team Members",
};

export default async function MembersSettingsPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const { organization, membership } = await getOrganizationBySlug(orgSlug, session.user.id);

  if (!organization || !membership) {
    notFound();
  }

  const [members, pendingInvitations] = await Promise.all([
    getOrganizationMembers(organization.id),
    prisma.invitation.findMany({
      where: {
        organizationId: organization.id,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
      include: {
        invitedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const canManageMembers = hasPermission(
    membership.role,
    Permission.ORG_MANAGE_MEMBERS
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground">
            Manage who has access to this organization
          </p>
        </div>
        {canManageMembers && (
          <InviteMemberDialog
            organizationId={organization.id}
            userRole={membership.role}
          />
        )}
      </div>

      {pendingInvitations.length > 0 && canManageMembers && (
        <PendingInvitations
          invitations={pendingInvitations}
          organizationId={organization.id}
        />
      )}

      <MembersTable
        members={members}
        currentUserId={session.user.id}
        organizationId={organization.id}
        userRole={membership.role}
        canManage={canManageMembers}
      />
    </div>
  );
}
