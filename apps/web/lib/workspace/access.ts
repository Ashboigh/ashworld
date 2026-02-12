import { prisma } from "@repo/database";
import type { OrgRoleType } from "@/lib/permissions";

export interface WorkspaceAccess {
  workspace: NonNullable<Awaited<ReturnType<typeof prisma.workspace.findUnique>>>;
  role: OrgRoleType;
}

export async function getWorkspaceAccess(
  workspaceId: string,
  userId: string
): Promise<WorkspaceAccess | null> {
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

  if (orgMember?.role === "org_admin" || orgMember?.role === "workspace_admin") {
    return { workspace, role: orgMember.role as OrgRoleType };
  }

  if (workspaceMember) {
    return { workspace, role: workspaceMember.role as OrgRoleType };
  }

  if (orgMember) {
    return { workspace, role: orgMember.role as OrgRoleType };
  }

  return null;
}
