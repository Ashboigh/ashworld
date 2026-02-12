import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { getOrganizationBySlug } from "@/lib/organization";
import { hasPermission, Permission } from "@/lib/permissions";
import { DocumentUpload } from "@/components/knowledge-base/document-upload";
import { DocumentList } from "@/components/knowledge-base/document-list";
import { SearchTest } from "@/components/knowledge-base/search-test";
import { ChevronLeft, Database, Settings, Plus } from "lucide-react";

interface PageProps {
  params: Promise<{ orgSlug: string; kbId: string }>;
}

export default async function KnowledgeBaseDetailPage({ params }: PageProps) {
  const { orgSlug, kbId } = await params;
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

  const knowledgeBase = await prisma.knowledgeBase.findUnique({
    where: { id: kbId },
    include: {
      workspace: true,
      documents: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          fileSize: true,
          sourceUrl: true,
          rawContent: true,
          errorMessage: true,
          processedAt: true,
          createdAt: true,
          _count: {
            select: { chunks: true },
          },
        },
      },
      _count: {
        select: { documents: true },
      },
    },
  });

  if (!knowledgeBase || knowledgeBase.workspace.organizationId !== organization.id) {
    notFound();
  }

  const canEdit = hasPermission(membership.role, Permission.KB_UPDATE);

  const completedDocs = knowledgeBase.documents.filter(
    (d) => d.status === "completed"
  ).length;
  const processingDocs = knowledgeBase.documents.filter(
    (d) => d.status === "processing" || d.status === "pending"
  ).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/${orgSlug}/knowledge-bases?workspace=${knowledgeBase.workspace.slug}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Knowledge Bases
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{knowledgeBase.name}</h1>
              {knowledgeBase.description && (
                <p className="text-muted-foreground mt-1">
                  {knowledgeBase.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>{knowledgeBase._count.documents} documents</span>
                <span>{completedDocs} indexed</span>
                {processingDocs > 0 && (
                  <span className="text-blue-600">
                    {processingDocs} processing
                  </span>
                )}
                <span>Model: {knowledgeBase.embeddingModel}</span>
              </div>
            </div>
          </div>

          {canEdit && (
            <button className="p-2 rounded-md hover:bg-muted">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Add Documents Section */}
      {canEdit && (
        <div className="border rounded-lg p-6 mb-6">
          <h2 className="font-semibold mb-4">Add Knowledge Base</h2>
          <DocumentUpload
            workspaceId={knowledgeBase.workspaceId}
            kbId={knowledgeBase.id}
          />
        </div>
      )}

      {/* Documents List */}
      <div className="mb-6">
        <h2 className="font-semibold mb-4">Documents</h2>
        <DocumentList
          documents={knowledgeBase.documents.map((doc) => ({
            ...doc,
            rawContent: doc.rawContent ? (typeof doc.rawContent === "string" ? doc.rawContent : null) : null,
            createdAt: doc.createdAt.toISOString(),
            processedAt: doc.processedAt?.toISOString() || null,
            chunkCount: doc._count.chunks,
          }))}
          workspaceId={knowledgeBase.workspaceId}
          kbId={knowledgeBase.id}
        />
      </div>

      {/* Test Search */}
      <div className="border rounded-lg p-6">
        <h2 className="font-semibold mb-4">Test Search</h2>
        {completedDocs === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Add and process documents to test search</p>
          </div>
        ) : (
          <SearchTest
            workspaceId={knowledgeBase.workspaceId}
            kbId={knowledgeBase.id}
          />
        )}
      </div>
    </div>
  );
}
