import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import {
  getOrganizationBySlug,
  getOrganizationWorkspaces,
} from "@/lib/organization";
import { hasPermission, Permission } from "@/lib/permissions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@repo/ui";
import { Layers, Plus } from "lucide-react";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export const metadata = {
  title: "Workspaces",
};

export default async function WorkspacesPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const { organization, membership } = await getOrganizationBySlug(orgSlug, session.user.id);

  if (!organization || !membership) {
    notFound();
  }

  const workspaces = await getOrganizationWorkspaces(
    organization.id,
    session.user.id
  );

  const canCreate = hasPermission(membership.role, Permission.WORKSPACE_CREATE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workspaces</h1>
          <p className="text-muted-foreground">
            Organize your chatbots and resources into workspaces
          </p>
        </div>
        {canCreate && (
          <CreateWorkspaceDialog organizationId={organization.id} />
        )}
      </div>

      {workspaces.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No workspaces yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first workspace to start organizing your chatbots
            </p>
            {canCreate && (
              <CreateWorkspaceDialog organizationId={organization.id} />
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <Link
              key={workspace.id}
              href={`/${orgSlug}/workspaces/${workspace.slug}`}
            >
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Layers className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="mt-4">{workspace.name}</CardTitle>
                  {workspace.description && (
                    <CardDescription className="line-clamp-2">
                      {workspace.description}
                    </CardDescription>
                  )}
                </CardHeader>
              </Card>
            </Link>
          ))}

          {canCreate && (
            <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer">
              <CreateWorkspaceDialog
                organizationId={organization.id}
                trigger={
                  <CardContent className="py-12 text-center h-full flex flex-col items-center justify-center">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-4">
                      <Plus className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">Create workspace</p>
                  </CardContent>
                }
              />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
