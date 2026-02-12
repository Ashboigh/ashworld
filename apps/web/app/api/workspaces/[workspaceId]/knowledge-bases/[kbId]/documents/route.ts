import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { hasPermission, Permission, OrgRoleType } from "@/lib/permissions";
import { addDocumentJob } from "@/lib/queue";
import * as fs from "fs/promises";
import * as path from "path";

interface RouteParams {
  params: Promise<{ workspaceId: string; kbId: string }>;
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

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// GET /api/workspaces/[workspaceId]/knowledge-bases/[kbId]/documents
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId, kbId } = await params;
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

    const documents = await prisma.kBDocument.findMany({
      where: { knowledgeBaseId: kbId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { chunks: true },
        },
      },
    });

    return NextResponse.json(
      documents.map((doc) => ({
        ...doc,
        chunkCount: doc._count.chunks,
      }))
    );
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/[workspaceId]/knowledge-bases/[kbId]/documents
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId, kbId } = await params;
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

    // Verify KB exists
    const kb = await prisma.knowledgeBase.findFirst({
      where: { id: kbId, workspaceId },
    });

    if (!kb) {
      return NextResponse.json(
        { error: "Knowledge base not found" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const url = formData.get("url") as string | null;
    const name = formData.get("name") as string | null;

    if (!file && !url) {
      return NextResponse.json(
        { error: "Either file or URL is required" },
        { status: 400 }
      );
    }

    let document;

    if (file) {
      // Handle file upload
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "File size exceeds 50MB limit" },
          { status: 400 }
        );
      }

      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      const allowedTypes = ["pdf", "docx", "txt", "md", "csv"];

      if (!allowedTypes.includes(extension)) {
        return NextResponse.json(
          { error: `Unsupported file type: ${extension}` },
          { status: 400 }
        );
      }

      // Ensure upload directory exists
      const kbUploadDir = path.join(UPLOAD_DIR, kbId);
      await fs.mkdir(kbUploadDir, { recursive: true });

      // Generate unique filename
      const filename = `${Date.now()}-${file.name}`;
      const filePath = path.join(kbUploadDir, filename);

      // Save file
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buffer);

      // Create document record
      document = await prisma.kBDocument.create({
        data: {
          knowledgeBaseId: kbId,
          name: name || file.name,
          type: extension,
          fileSize: file.size,
          filePath,
          status: "pending",
        },
      });
    } else if (url) {
      // Handle URL
      document = await prisma.kBDocument.create({
        data: {
          knowledgeBaseId: kbId,
          name: name || new URL(url).hostname,
          type: "url",
          sourceUrl: url,
          status: "pending",
        },
      });
    }

    if (!document) {
      return NextResponse.json(
        { error: "Failed to create document" },
        { status: 500 }
      );
    }

    // Queue document for processing
    await addDocumentJob({
      documentId: document.id,
      knowledgeBaseId: kbId,
      type: "process",
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
