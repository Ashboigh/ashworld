import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { getOrganizationBySlug } from "@/lib/organization";
import { hasPermission, Permission } from "@/lib/permissions";
import { CreateKBDialog } from "@/components/knowledge-base/create-kb-dialog";
import { KBList } from "@/components/knowledge-base/kb-list";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ workspace?: string }>;
}

export default async function KnowledgeBasesPage({
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

  if (!hasPermission(membership.role, Permission.KB_VIEW)) {
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
        <h1 className="text-2xl font-bold mb-4">Knowledge Bases</h1>
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground mb-4">
            Create a workspace first to manage knowledge bases
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

  // Get knowledge bases for current workspace
  const knowledgeBases = await prisma.knowledgeBase.findMany({
    where: { workspaceId: workspace.id },
    include: {
      _count: {
        select: { documents: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const canCreate = hasPermission(membership.role, Permission.KB_CREATE);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Bases</h1>
          <p className="text-muted-foreground mt-1">
            Manage your document collections for AI retrieval
          </p>
        </div>
        {canCreate && <CreateKBDialog workspaceId={workspace.id} />}
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
              window.location.href = `/${orgSlug}/knowledge-bases?workspace=${e.target.value}`;
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

      <KBList
        knowledgeBases={knowledgeBases.map((kb) => ({
          ...kb,
          documentCount: kb._count.documents,
          createdAt: kb.createdAt.toISOString(),
        }))}
        workspaceId={workspace.id}
        orgSlug={orgSlug}
      />
    </div>
  );
}
