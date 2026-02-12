import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";
import { getWorkspaceAccess } from "@/lib/workspace/access";
import { getAmalenaWorkflowTemplates } from "@/lib/workflow/templates/amalena";

interface RouteParams {
  params: Promise<{ workspaceId: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
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

    const templates = getAmalenaWorkflowTemplates();
    const names = templates.map((template) => template.name);
    const existingWorkflows = await prisma.workflow.findMany({
      where: {
        workspaceId,
        name: { in: names },
      },
      select: {
        name: true,
      },
    });
    const existingNames = new Set(existingWorkflows.map((wf) => wf.name));
    const created: string[] = [];
    let hasDefault =
      (await prisma.workflow.count({
        where: { workspaceId, isDefault: true },
      })) > 0;

    for (const template of templates) {
      if (existingNames.has(template.name)) {
        continue;
      }

      const shouldSetDefault = template.isDefault && !hasDefault;

      await prisma.workflow.create({
        data: {
          workspaceId,
          name: template.name,
          description: template.description,
          status: "published",
          triggerType: template.triggerType,
          isDefault: shouldSetDefault,
          nodes: {
            create: template.nodes.map((node) => ({
              nodeId: node.nodeId,
              type: node.type,
              positionX: node.positionX,
              positionY: node.positionY,
              config: node.config,
            })),
          },
          edges: {
            create: template.edges.map((edge) => ({
              edgeId: edge.edgeId,
              source: edge.source,
              target: edge.target,
              sourceHandle: edge.sourceHandle,
              label: edge.label,
            })),
          },
          variables: {
            create: (template.variables ?? []).map((variable) => ({
              name: variable.name,
              type: variable.type,
              defaultValue: variable.defaultValue,
              description: variable.description,
            })),
          },
        },
      });

      created.push(template.name);
      if (shouldSetDefault) {
        hasDefault = true;
      }
    }

    const skipped = names.filter((name) => !created.includes(name));

    return NextResponse.json({ created, skipped });
  } catch (error) {
    console.error("Error importing workflow templates:", error);
    return NextResponse.json(
      { error: "Failed to import workflow templates" },
      { status: 500 }
    );
  }
}
