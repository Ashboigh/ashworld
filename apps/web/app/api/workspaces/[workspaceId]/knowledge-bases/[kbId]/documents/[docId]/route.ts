import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { hasPermission, Permission, OrgRoleType } from "@/lib/permissions";
import { addDocumentJob } from "@/lib/queue";
import * as fs from "fs/promises";

interface RouteParams {
  params: Promise<{ workspaceId: string; kbId: string; docId: string }>;
}

async function getWorkspaceAccess(workspaceId: string, userId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      organization: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
      members: {
        where: { userId },
      },
    },
  });

  if (!workspace) {
    return null;
  }

  const orgMember = workspace.organization.members[0];
  const workspaceMember = workspace.members[0];

  if (orgMember?.role === "org_admin" || orgMember?.role === "workspace_admin") {
    return { workspace, role: orgMember.role as OrgRoleType };
  }

  if (workspaceMember) {
    return { workspace, role: workspaceMember.role as OrgRoleType };
  }

  if (orgMember) {
    return { workspace, role: orgMember.role as OrgRoleType };
  }

  return null;
}

// GET /api/workspaces/[workspaceId]/knowledge-bases/[kbId]/documents/[docId]
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId, kbId, docId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getWorkspaceAccess(workspaceId, session.user.id);

    if (!access || !hasPermission(access.role, Permission.WORKSPACE_VIEW)) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    const includeChunks = new URL(_request.url).searchParams.get("chunks") === "true";

    const document = await prisma.kBDocument.findFirst({
      where: {
        id: docId,
        knowledgeBaseId: kbId,
      },
      include: {
        _count: {
          select: { chunks: true },
        },
        chunks: includeChunks
          ? {
              select: {
                id: true,
                content: true,
                chunkIndex: true,
                tokenCount: true,
              },
              orderBy: { chunkIndex: "asc" },
            }
          : false,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...document,
      chunkCount: document._count.chunks,
    });
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/[workspaceId]/knowledge-bases/[kbId]/documents/[docId]
// Reprocess document
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId, kbId, docId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getWorkspaceAccess(workspaceId, session.user.id);

    if (!access || !hasPermission(access.role, Permission.KB_UPDATE)) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    const document = await prisma.kBDocument.findFirst({
      where: {
        id: docId,
        knowledgeBaseId: kbId,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Reset status
    await prisma.kBDocument.update({
      where: { id: docId },
      data: {
        status: "pending",
        errorMessage: null,
      },
    });

    // Queue for reprocessing
    await addDocumentJob({
      documentId: docId,
      knowledgeBaseId: kbId,
      type: "process",
    });

    return NextResponse.json({ message: "Document queued for reprocessing" });
  } catch (error) {
    console.error("Error reprocessing document:", error);
    return NextResponse.json(
      { error: "Failed to reprocess document" },
      { status: 500 }
    );
  }
}

// DELETE /api/workspaces/[workspaceId]/knowledge-bases/[kbId]/documents/[docId]
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId, kbId, docId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getWorkspaceAccess(workspaceId, session.user.id);

    if (!access || !hasPermission(access.role, Permission.KB_UPDATE)) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    const document = await prisma.kBDocument.findFirst({
      where: {
        id: docId,
        knowledgeBaseId: kbId,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Delete the file if it exists
    if (document.filePath) {
      try {
        await fs.unlink(document.filePath);
      } catch {
        // File may not exist, continue with deletion
      }
    }

    // Delete document (cascades to chunks)
    await prisma.kBDocument.delete({
      where: { id: docId },
    });

    return NextResponse.json({ message: "Document deleted" });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
