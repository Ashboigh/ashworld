import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getOrganizationBySlug,
  getOrganizationWorkspaces,
} from "@/lib/organization";
import { prisma } from "@repo/database";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@repo/ui";
import { Building2, Users, Layers, Bot } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { orgSlug } = await params;
  return {
    title: `Dashboard - ${orgSlug}`,
  };
}

export default async function OrgDashboardPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const { organization } = await getOrganizationBySlug(orgSlug, session.user.id);

  if (!organization) {
    return null;
  }

  const [workspaces, memberCount] = await Promise.all([
    getOrganizationWorkspaces(organization.id, session.user.id),
    prisma.organizationMember.count({
      where: { organizationId: organization.id },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{organization.name}</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s an overview of your organization.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workspaces</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workspaces.length}</div>
            <p className="text-xs text-muted-foreground">Active workspaces</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memberCount}</div>
            <p className="text-xs text-muted-foreground">
              Organization members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chatbots</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Total chatbots</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workspaces</CardTitle>
            <CardDescription>
              Your organization&apos;s workspaces
            </CardDescription>
          </CardHeader>
          <CardContent>
            {workspaces.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No workspaces yet.{" "}
                <Link
                  href={`/${orgSlug}/workspaces`}
                  className="text-primary hover:underline"
                >
                  Create your first workspace
                </Link>
              </p>
            ) : (
              <div className="space-y-2">
                {workspaces.slice(0, 5).map((workspace) => (
                  <Link
                    key={workspace.id}
                    href={`/${orgSlug}/workspaces/${workspace.slug}`}
                    className="flex items-center justify-between rounded-md border p-3 hover:bg-accent"
                  >
                    <div>
                      <p className="font-medium">{workspace.name}</p>
                      {workspace.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-[250px]">
                          {workspace.description}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
                {workspaces.length > 5 && (
                  <Link
                    href={`/${orgSlug}/workspaces`}
                    className="block text-sm text-primary hover:underline"
                  >
                    View all {workspaces.length} workspaces
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Complete these steps to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li className={workspaces.length > 0 ? "text-muted-foreground line-through" : ""}>
                Create a workspace
              </li>
              <li className="text-muted-foreground">
                Set up a knowledge base with your content
              </li>
              <li className="text-muted-foreground">
                Create your first chatbot
              </li>
              <li className="text-muted-foreground">
                Build a workflow to define chatbot behavior
              </li>
              <li className="text-muted-foreground">
                Deploy your chatbot to your website
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
