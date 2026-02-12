import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { hasPermission, Permission, OrgRoleType } from "@/lib/permissions";
import { searchKnowledgeBaseSchema } from "@/lib/validations/knowledge-base";
import { vectorSearch, hybridSearch } from "@/lib/knowledge-base/search";
import { recordAnalyticsEvent } from "@/lib/analytics/events";

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

// POST /api/workspaces/[workspaceId]/knowledge-bases/[kbId]/search
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json();
    const result = searchKnowledgeBaseSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { query, limit, threshold, mode } = result.data;

    const searchFn = mode === "hybrid" ? hybridSearch : vectorSearch;

    const results = await searchFn(kbId, query, {
      limit,
      threshold,
    });

    const topDocuments = Array.from(
      new Set(results.slice(0, 5).map((result) => result.documentName))
    );

    if (access.workspace.organizationId) {
      await recordAnalyticsEvent({
        organizationId: access.workspace.organizationId,
        workspaceId: access.workspace.id,
        eventType: results.length > 0 ? "kb.search" : "kb.search.failed",
        payload: {
          query,
          mode,
          resultCount: results.length,
          threshold,
          limit,
          topDocuments,
        },
      });
    }

    return NextResponse.json({
      query,
      results,
      total: results.length,
    });
  } catch (error) {
    console.error("Error searching knowledge base:", error);
    return NextResponse.json(
      { error: "Failed to search knowledge base" },
      { status: 500 }
    );
  }
}
