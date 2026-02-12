import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { createWorkflowSchema } from "@/lib/validations/workflow";
import { hasPermission, Permission } from "@/lib/permissions";
import { getWorkspaceAccess } from "@/lib/workspace/access";

interface RouteParams {
  params: Promise<{ workspaceId: string }>;
}

// GET /api/workspaces/[workspaceId]/workflows
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId } = await params;
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

    const workflows = await prisma.workflow.findMany({
      where: { workspaceId },
      include: {
        _count: {
          select: { nodes: true, edges: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(
      workflows.map((wf) => ({
        ...wf,
        nodeCount: wf._count.nodes,
        edgeCount: wf._count.edges,
      }))
    );
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflows" },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/[workspaceId]/workflows
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getWorkspaceAccess(workspaceId, session.user.id);

    if (!access || !hasPermission(access.role, Permission.WORKFLOW_CREATE)) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = createWorkflowSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    // If setting as default, unset existing default
    if (result.data.isDefault) {
      await prisma.workflow.updateMany({
        where: { workspaceId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Create workflow with default start node
    const workflow = await prisma.workflow.create({
      data: {
        workspaceId,
        name: result.data.name,
        description: result.data.description,
        triggerType: result.data.triggerType,
        isDefault: result.data.isDefault,
        nodes: {
          create: {
            nodeId: "start-1",
            type: "start",
            positionX: 250,
            positionY: 50,
            config: {},
          },
        },
      },
      include: {
        nodes: true,
        edges: true,
        variables: true,
      },
    });

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    console.error("Error creating workflow:", error);
    return NextResponse.json(
      { error: "Failed to create workflow" },
      { status: 500 }
    );
  }
}
