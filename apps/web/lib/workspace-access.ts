import { prisma } from "@repo/database";
import type { OrgRoleType } from "@/lib/permissions";

export interface WorkspaceAccess {
  workspaceId: string;
  role: OrgRoleType;
}

export async function getWorkspaceAccess(workspaceId: string, userId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      organization: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
      members: {
        where: { userId },
      },
    },
  });

  if (!workspace) {
    return null;
  }

  const orgMember = workspace.organization.members[0];
  const workspaceMember = workspace.members[0];
  const role =
    (orgMember?.role === "org_admin" || orgMember?.role === "workspace_admin"
      ? orgMember.role
      : workspaceMember?.role || orgMember?.role) as OrgRoleType | undefined;

  if (!role) {
    return null;
  }

  return { workspace, role };
}
