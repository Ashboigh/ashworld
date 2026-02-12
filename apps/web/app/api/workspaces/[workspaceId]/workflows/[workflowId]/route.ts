import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { updateWorkflowSchema } from "@/lib/validations/workflow";
import { hasPermission, Permission } from "@/lib/permissions";
import { getWorkspaceAccess } from "@/lib/workspace/access";

interface RouteParams {
  params: Promise<{ workspaceId: string; workflowId: string }>;
}

// GET /api/workspaces/[workspaceId]/workflows/[workflowId]
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

    // Transform to match frontend format
    const transformed = {
      ...workflow,
      nodes: workflow.nodes.map((n) => ({
        id: n.nodeId,
        type: n.type,
        position: { x: n.positionX, y: n.positionY },
        data: {
          type: n.type,
          label: (n.config as Record<string, unknown>)?.label || n.type,
          config: n.config,
        },
      })),
      edges: workflow.edges.map((e) => ({
        id: e.edgeId,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        data: { label: e.label },
        type: "smoothstep",
      })),
    };

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error fetching workflow:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflow" },
      { status: 500 }
    );
  }
}

// PUT /api/workspaces/[workspaceId]/workflows/[workflowId]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId, workflowId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getWorkspaceAccess(workspaceId, session.user.id);

    if (!access || !hasPermission(access.role, Permission.WORKFLOW_UPDATE)) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = updateWorkflowSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    // Verify workflow exists and belongs to workspace
    const existing = await prisma.workflow.findFirst({
      where: { id: workflowId, workspaceId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // If setting as default, unset existing default
    if (result.data.isDefault) {
      await prisma.workflow.updateMany({
        where: { workspaceId, isDefault: true, id: { not: workflowId } },
        data: { isDefault: false },
      });
    }

    // Update workflow in a transaction
    const workflow = await prisma.$transaction(async (tx) => {
      // Update basic workflow info
      const updatedWorkflow = await tx.workflow.update({
        where: { id: workflowId },
        data: {
          name: result.data.name,
          description: result.data.description,
          triggerType: result.data.triggerType,
          isDefault: result.data.isDefault,
        },
      });

      // Update nodes if provided
      if (result.data.nodes) {
        // Delete existing nodes
        await tx.workflowNode.deleteMany({ where: { workflowId } });

        // Create new nodes
        if (result.data.nodes.length > 0) {
          await tx.workflowNode.createMany({
            data: result.data.nodes.map((n) => ({
              workflowId,
              nodeId: n.nodeId,
              type: n.type,
              positionX: n.positionX,
              positionY: n.positionY,
              config: n.config as object,
            })),
          });
        }
      }

      // Update edges if provided
      if (result.data.edges) {
        // Delete existing edges
        await tx.workflowEdge.deleteMany({ where: { workflowId } });

        // Create new edges
        if (result.data.edges.length > 0) {
          await tx.workflowEdge.createMany({
            data: result.data.edges.map((e) => ({
              workflowId,
              edgeId: e.edgeId,
              source: e.source,
              target: e.target,
              sourceHandle: e.sourceHandle,
              label: e.label,
            })),
          });
        }
      }

      // Update variables if provided
      if (result.data.variables) {
        // Delete existing variables
        await tx.workflowVariable.deleteMany({ where: { workflowId } });

        // Create new variables
        if (result.data.variables.length > 0) {
          await tx.workflowVariable.createMany({
            data: result.data.variables.map((v) => ({
              workflowId,
              name: v.name,
              type: v.type,
              defaultValue: v.defaultValue,
              description: v.description,
            })),
          });
        }
      }

      return updatedWorkflow;
    });

    return NextResponse.json(workflow);
  } catch (error) {
    console.error("Error updating workflow:", error);
    return NextResponse.json(
      { error: "Failed to update workflow" },
      { status: 500 }
    );
  }
}

// DELETE /api/workspaces/[workspaceId]/workflows/[workflowId]
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId, workflowId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getWorkspaceAccess(workspaceId, session.user.id);

    if (!access || !hasPermission(access.role, Permission.WORKFLOW_DELETE)) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    // Verify workflow exists and belongs to workspace
    const existing = await prisma.workflow.findFirst({
      where: { id: workflowId, workspaceId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    await prisma.workflow.delete({ where: { id: workflowId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting workflow:", error);
    return NextResponse.json(
      { error: "Failed to delete workflow" },
      { status: 500 }
    );
  }
}
