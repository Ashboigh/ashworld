import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { hasPermission, Permission, OrgRoleType } from "@/lib/permissions";
import { addScrapeJob } from "@/lib/queue";

interface RouteParams {
  params: Promise<{ workspaceId: string; kbId: string }>;
}

interface ScrapePayload {
  urls: string[];
  selectors?: string[];
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

// POST /api/workspaces/[workspaceId]/knowledge-bases/[kbId]/scrape
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

    const kb = await prisma.knowledgeBase.findFirst({
      where: { id: kbId, workspaceId },
    });

    if (!kb) {
      return NextResponse.json(
        { error: "Knowledge base not found" },
        { status: 404 }
      );
    }

    const payload: ScrapePayload = await request.json();
    const urls = Array.isArray(payload.urls)
      ? payload.urls.map((u) => u.trim()).filter(Boolean)
      : [];

    if (urls.length === 0) {
      return NextResponse.json(
        { error: "At least one URL is required" },
        { status: 400 }
      );
    }

    // Queue the scrape job for background processing - returns immediately
    const job = await addScrapeJob({
      knowledgeBaseId: kbId,
      urls: urls.slice(0, 10),
      selectors: payload.selectors,
    });

    return NextResponse.json(
      {
        message: "Scrape job queued successfully",
        jobId: job.id,
        urlCount: Math.min(urls.length, 10),
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("Error queuing scrape job:", error);
    return NextResponse.json(
      { error: "Failed to queue scrape job" },
      { status: 500 }
    );
  }
}
