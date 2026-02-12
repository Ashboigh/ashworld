import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { getOrganizationBySlug } from "@/lib/organization";
import { hasPermission, Permission } from "@/lib/permissions";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import type { WorkflowData, NodeType } from "@/lib/workflow";

interface PageProps {
  params: Promise<{ orgSlug: string; workflowId: string }>;
}

export default async function WorkflowEditorPage({ params }: PageProps) {
  const { orgSlug, workflowId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { organization, membership } = await getOrganizationBySlug(
    orgSlug,
    session.user.id
  );

  if (!organization || !membership) {
    redirect("/onboarding");
  }

  if (!hasPermission(membership.role, Permission.WORKFLOW_VIEW)) {
    redirect(`/${orgSlug}`);
  }

  // Fetch workflow with all related data
  const workflow = await prisma.workflow.findFirst({
    where: {
      id: workflowId,
      workspace: {
        organizationId: organization.id,
      },
    },
    include: {
      workspace: true,
      nodes: true,
      edges: true,
      variables: true,
    },
  });

  if (!workflow) {
    notFound();
  }

  // Fetch knowledge bases for the workspace
  const knowledgeBases = await prisma.knowledgeBase.findMany({
    where: { workspaceId: workflow.workspaceId },
    select: { id: true, name: true },
  });

  // Transform workflow data to match frontend format
  const workflowData: WorkflowData = {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description || undefined,
    status: workflow.status as "draft" | "published" | "archived",
    triggerType: workflow.triggerType as
      | "conversation_start"
      | "keyword"
      | "intent"
      | "api",
    isDefault: workflow.isDefault,
    version: workflow.version,
    nodes: workflow.nodes.map((n) => ({
      id: n.nodeId,
      type: n.type as NodeType,
      position: { x: n.positionX, y: n.positionY },
      data: {
        type: n.type as NodeType,
        label: (n.config as Record<string, unknown>)?.label as string || n.type,
        config: n.config as Record<string, unknown>,
      },
    })),
    edges: workflow.edges.map((e) => ({
      id: e.edgeId,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || undefined,
      data: { label: e.label || undefined },
      type: "smoothstep",
    })),
    variables: workflow.variables.map((v) => ({
      id: v.id,
      name: v.name,
      type: v.type as "string" | "number" | "boolean" | "array" | "object",
      defaultValue: v.defaultValue || undefined,
      description: v.description || undefined,
    })),
  };

  return (
    <div className="h-screen -m-6">
      <WorkflowBuilder
        workspaceId={workflow.workspaceId}
        workflow={workflowData}
        knowledgeBases={knowledgeBases}
        orgSlug={orgSlug}
      />
    </div>
  );
}
