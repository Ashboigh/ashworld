import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { createKnowledgeBaseSchema } from "@/lib/validations/knowledge-base";
import { hasPermission, Permission, OrgRoleType } from "@/lib/permissions";
import { checkOrganizationLimit } from "@/lib/billing";

interface RouteParams {
  params: Promise<{ workspaceId: string }>;
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

  // org_admin and workspace_admin have full access
  if (orgMember?.role === "org_admin" || orgMember?.role === "workspace_admin") {
    return { workspace, role: orgMember.role as OrgRoleType };
  }

  // Check workspace membership
  if (workspaceMember) {
    return { workspace, role: workspaceMember.role as OrgRoleType };
  }

  // Fall back to org role if member of org
  if (orgMember) {
    return { workspace, role: orgMember.role as OrgRoleType };
  }

  return null;
}

// GET /api/workspaces/[workspaceId]/knowledge-bases
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId } = await params;
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

    const knowledgeBases = await prisma.knowledgeBase.findMany({
      where: { workspaceId },
      include: {
        _count: {
          select: { documents: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      knowledgeBases.map((kb) => ({
        ...kb,
        documentCount: kb._count.documents,
      }))
    );
  } catch (error) {
    console.error("Error fetching knowledge bases:", error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge bases" },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/[workspaceId]/knowledge-bases
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getWorkspaceAccess(workspaceId, session.user.id);

    if (!access || !hasPermission(access.role, Permission.KB_CREATE)) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    // Check knowledge base limit
    const limitCheck = await checkOrganizationLimit(
      access.workspace.organizationId,
      "knowledgeBases"
    );
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: "Knowledge base limit reached",
          code: "LIMIT_EXCEEDED",
          details: {
            resource: "knowledgeBases",
            current: limitCheck.currentUsage,
            limit: limitCheck.limit,
            message: limitCheck.upgradeMessage,
          },
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = createKnowledgeBaseSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const knowledgeBase = await prisma.knowledgeBase.create({
      data: {
        workspaceId,
        name: result.data.name,
        description: result.data.description,
        embeddingModel: result.data.embeddingModel,
        chunkSize: result.data.chunkSize,
        chunkOverlap: result.data.chunkOverlap,
      },
    });

    return NextResponse.json(knowledgeBase, { status: 201 });
  } catch (error) {
    console.error("Error creating knowledge base:", error);
    return NextResponse.json(
      { error: "Failed to create knowledge base" },
      { status: 500 }
    );
  }
}
