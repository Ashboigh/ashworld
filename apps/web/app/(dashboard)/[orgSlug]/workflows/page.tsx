import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { getOrganizationBySlug } from "@/lib/organization";
import { hasPermission, Permission } from "@/lib/permissions";
import { CreateWorkflowDialog } from "@/components/workflow/create-workflow-dialog";
import { WorkflowList } from "@/components/workflow/workflow-list";
import { WorkflowTemplateImportButton } from "@/components/workflow/workflow-template-import-button";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ workspace?: string }>;
}

export default async function WorkflowsPage({
  params,
  searchParams,
}: PageProps) {
  const { orgSlug } = await params;
  const { workspace: workspaceSlug } = await searchParams;
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

  // Get workspace - either from query param or first workspace
  let workspace;
  if (workspaceSlug) {
    workspace = await prisma.workspace.findFirst({
      where: {
        organizationId: organization.id,
        slug: workspaceSlug,
      },
    });
  }

  if (!workspace) {
    workspace = await prisma.workspace.findFirst({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "asc" },
    });
  }

  if (!workspace) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Workflows</h1>
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground mb-4">
            Create a workspace first to manage workflows
          </p>
          <a
            href={`/${orgSlug}/workspaces`}
            className="text-primary hover:underline"
          >
            Go to Workspaces
          </a>
        </div>
      </div>
    );
  }

  // Get all workspaces for selector
  const workspaces = await prisma.workspace.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "asc" },
  });

  // Get workflows for current workspace
  const workflows = await prisma.workflow.findMany({
    where: { workspaceId: workspace.id },
    include: {
      _count: {
        select: { nodes: true, edges: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const canCreate = hasPermission(membership.role, Permission.WORKFLOW_CREATE);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="text-muted-foreground mt-1">
            Design conversation flows with the visual builder
          </p>
        </div>
        {canCreate && (
          <div className="flex items-center gap-2">
            <CreateWorkflowDialog workspaceId={workspace.id} orgSlug={orgSlug} />
            <WorkflowTemplateImportButton workspaceId={workspace.id} />
          </div>
        )}
      </div>

      {workspaces.length > 1 && (
        <div className="mb-6">
          <label className="text-sm text-muted-foreground mr-2">
            Workspace:
          </label>
          <select
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
            defaultValue={workspace.slug}
            onChange={(e) => {
              window.location.href = `/${orgSlug}/workflows?workspace=${e.target.value}`;
            }}
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.slug}>
                {ws.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <WorkflowList
        workflows={workflows.map((wf) => ({
          ...wf,
          nodeCount: wf._count.nodes,
          edgeCount: wf._count.edges,
          createdAt: wf.createdAt.toISOString(),
          updatedAt: wf.updatedAt.toISOString(),
        }))}
        workspaceId={workspace.id}
        orgSlug={orgSlug}
      />
    </div>
  );
}
