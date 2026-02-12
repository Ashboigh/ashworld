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

// POST /api/workspaces/[workspaceId]/workflows/[workflowId]/publish
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId, workflowId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getWorkspaceAccess(workspaceId, session.user.id);

    if (!access || !hasPermission(access.role, Permission.WORKFLOW_PUBLISH)) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    // Fetch the workflow with all related data
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, workspaceId },
      include: {
        nodes: true,
        edges: true,
        variables: true,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Validate workflow has at least start and end nodes
    const hasStartNode = workflow.nodes.some((n) => n.type === "start");
    if (!hasStartNode) {
      return NextResponse.json(
        { error: "Workflow must have a start node" },
        { status: 400 }
      );
    }

    // Create a new version
    const newVersion = workflow.version + 1;

    // Create version snapshot and update workflow in transaction
    const [_version, updatedWorkflow] = await prisma.$transaction([
      prisma.workflowVersion.create({
        data: {
          workflowId,
          version: newVersion,
          publishedBy: session.user.id,
          data: {
            nodes: workflow.nodes,
            edges: workflow.edges,
            variables: workflow.variables,
          },
        },
      }),
      prisma.workflow.update({
        where: { id: workflowId },
        data: {
          status: "published",
          version: newVersion,
          publishedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      version: newVersion,
      publishedAt: updatedWorkflow.publishedAt,
    });
  } catch (error) {
    console.error("Error publishing workflow:", error);
    return NextResponse.json(
      { error: "Failed to publish workflow" },
      { status: 500 }
    );
  }
}
