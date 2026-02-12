import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { getOrganizationBySlug } from "@/lib/organization";
import { hasPermission, Permission } from "@/lib/permissions";
import { Button } from "@repo/ui";

interface PageProps {
  params: Promise<{ orgSlug: string; workspaceSlug: string }>;
}

export const metadata = {
  title: "Workspace",
};

export default async function WorkspaceDetailPage({ params }: PageProps) {
  const { orgSlug, workspaceSlug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }

  const { organization, membership } = await getOrganizationBySlug(
    orgSlug,
    session.user.id
  );

  if (!organization || !membership) {
    notFound();
  }

  const workspace = await prisma.workspace.findFirst({
    where: {
      slug: workspaceSlug,
      organizationId: organization.id,
    },
  });

  if (!workspace) {
    notFound();
  }

  const [chatbotCount, knowledgeBaseCount] = await Promise.all([
    prisma.chatbot.count({ where: { workspaceId: workspace.id } }),
    prisma.knowledgeBase.count({ where: { workspaceId: workspace.id } }),
  ]);

  const canViewAnalytics = hasPermission(membership.role, Permission.ANALYTICS_VIEW);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{workspace.name}</h1>
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
            {workspace.slug}
          </span>
        </div>
        {workspace.description && (
          <p className="text-sm text-muted-foreground">{workspace.description}</p>
        )}
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-background p-4 space-y-2">
          <p className="text-sm text-muted-foreground">Chatbots</p>
          <p className="text-3xl font-semibold">{chatbotCount}</p>
          <Link href={`/${orgSlug}/chatbots?workspace=${workspace.slug}`}>
            <Button variant="ghost" size="sm">
              Manage chatbots
            </Button>
          </Link>
        </div>
        <div className="rounded-lg border border-border bg-background p-4 space-y-2">
          <p className="text-sm text-muted-foreground">Knowledge bases</p>
          <p className="text-3xl font-semibold">{knowledgeBaseCount}</p>
          <Link href={`/${orgSlug}/knowledge-bases?workspace=${workspace.slug}`}>
            <Button variant="ghost" size="sm">
              Open knowledge bases
            </Button>
          </Link>
        </div>
        {canViewAnalytics && (
          <div className="rounded-lg border border-border bg-background p-4 space-y-2">
            <p className="text-sm text-muted-foreground">Analytics</p>
            <p className="text-3xl font-semibold">—</p>
            <Link href={`/${orgSlug}/analytics?workspace=${workspace.slug}`}>
              <Button variant="ghost" size="sm">
                Open analytics
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-dashed border-border/80 bg-muted/50 p-4">
        <p className="text-sm">
          The workspace page is a landing area. Use the cards above to drill into
          the chatbots, knowledge bases, or analytics for this workspace.
        </p>
      </div>
    </div>
  );
}
