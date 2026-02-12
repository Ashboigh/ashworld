import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { updateKnowledgeBaseSchema } from "@/lib/validations/knowledge-base";
import { hasPermission, Permission, OrgRoleType } from "@/lib/permissions";

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

// GET /api/workspaces/[workspaceId]/knowledge-bases/[kbId]
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

    const knowledgeBase = await prisma.knowledgeBase.findFirst({
      where: {
        id: kbId,
        workspaceId,
      },
      include: {
        documents: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            fileSize: true,
            errorMessage: true,
            processedAt: true,
            createdAt: true,
          },
        },
        _count: {
          select: { documents: true },
        },
      },
    });

    if (!knowledgeBase) {
      return NextResponse.json(
        { error: "Knowledge base not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...knowledgeBase,
      documentCount: knowledgeBase._count.documents,
    });
  } catch (error) {
    console.error("Error fetching knowledge base:", error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge base" },
      { status: 500 }
    );
  }
}

// PATCH /api/workspaces/[workspaceId]/knowledge-bases/[kbId]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json();
    const result = updateKnowledgeBaseSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const knowledgeBase = await prisma.knowledgeBase.update({
      where: { id: kbId },
      data: result.data,
    });

    return NextResponse.json(knowledgeBase);
  } catch (error) {
    console.error("Error updating knowledge base:", error);
    return NextResponse.json(
      { error: "Failed to update knowledge base" },
      { status: 500 }
    );
  }
}

// DELETE /api/workspaces/[workspaceId]/knowledge-bases/[kbId]
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId, kbId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getWorkspaceAccess(workspaceId, session.user.id);

    if (!access || !hasPermission(access.role, Permission.KB_DELETE)) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    // This will cascade delete all documents and chunks
    await prisma.knowledgeBase.delete({
      where: { id: kbId },
    });

    return NextResponse.json({ message: "Knowledge base deleted" });
  } catch (error) {
    console.error("Error deleting knowledge base:", error);
    return NextResponse.json(
      { error: "Failed to delete knowledge base" },
      { status: 500 }
    );
  }
}
