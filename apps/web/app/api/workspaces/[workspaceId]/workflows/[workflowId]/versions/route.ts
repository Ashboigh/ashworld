import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { hasPermission, Permission, OrgRoleType } from "@/lib/permissions";

interface RouteParams {
  params: Promise<{ workspaceId: string; workflowId: string }>;
}

async function getWorkspaceAccess(workspaceId: string, userId: string) {
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

// GET /api/workspaces/[workspaceId]/workflows/[workflowId]/versions
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId, workflowId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getWorkspaceAccess(workspaceId, session.user.id);

    if (!access || !hasPermission(access.role, Permission.WORKFLOW_VIEW)) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    // Verify workflow belongs to workspace
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, workspaceId },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    const versions = await prisma.workflowVersion.findMany({
      where: { workflowId },
      orderBy: { version: "desc" },
      select: {
        id: true,
        version: true,
        publishedBy: true,
        createdAt: true,
      },
    });

    // Get user names for published by
    const userIds = versions
      .map((v) => v.publishedBy)
      .filter((id): id is string => id !== null);

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const versionsWithUsers = versions.map((v) => {
      const user = v.publishedBy ? userMap.get(v.publishedBy) : null;
      return {
        ...v,
        publishedByName: user
          ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email
          : "Unknown",
      };
    });

    return NextResponse.json(versionsWithUsers);
  } catch (error) {
    console.error("Error fetching workflow versions:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflow versions" },
      { status: 500 }
    );
  }
}
