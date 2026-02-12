import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma, Prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { updateWorkspaceSchema } from "@/lib/validations/organization";
import {
  getOrganizationMemberRole,
  createAuditLog,
} from "@/lib/organization";
import { hasPermission, Permission } from "@/lib/permissions";

interface RouteParams {
  params: Promise<{ orgId: string; workspaceId: string }>;
}

// GET /api/organizations/[orgId]/workspaces/[workspaceId]
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, workspaceId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getOrganizationMemberRole(orgId, session.user.id);

    if (!role || !hasPermission(role, Permission.WORKSPACE_VIEW)) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        organizationId: orgId,
      },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // If not org_admin or workspace_admin, check workspace membership
    if (role !== "org_admin" && role !== "workspace_admin") {
      const workspaceMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: session.user.id,
          },
        },
      });

      if (!workspaceMember) {
        return NextResponse.json(
          { error: "Access denied to this workspace" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      ...workspace,
      memberCount: workspace._count.members,
    });
  } catch (error) {
    console.error("Error fetching workspace:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspace" },
      { status: 500 }
    );
  }
}

// PATCH /api/organizations/[orgId]/workspaces/[workspaceId]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, workspaceId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getOrganizationMemberRole(orgId, session.user.id);

    if (!role || !hasPermission(role, Permission.WORKSPACE_UPDATE)) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = updateWorkspaceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const oldWorkspace = await prisma.workspace.findFirst({
      where: { id: workspaceId, organizationId: orgId },
    });

    if (!oldWorkspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...result.data,
        settings: result.data.settings as Prisma.InputJsonValue | undefined,
      },
    });

    // Create audit log
    await createAuditLog({
      organizationId: orgId,
      userId: session.user.id,
      action: "workspace.updated",
      resourceType: "workspace",
      resourceId: workspaceId,
      oldValues: oldWorkspace,
      newValues: workspace,
    });

    return NextResponse.json(workspace);
  } catch (error) {
    console.error("Error updating workspace:", error);
    return NextResponse.json(
      { error: "Failed to update workspace" },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/[orgId]/workspaces/[workspaceId]
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, workspaceId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getOrganizationMemberRole(orgId, session.user.id);

    if (!role || !hasPermission(role, Permission.WORKSPACE_DELETE)) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId, organizationId: orgId },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    await prisma.workspace.delete({
      where: { id: workspaceId },
    });

    // Create audit log
    await createAuditLog({
      organizationId: orgId,
      userId: session.user.id,
      action: "workspace.deleted",
      resourceType: "workspace",
      resourceId: workspaceId,
      oldValues: workspace,
    });

    return NextResponse.json({ message: "Workspace deleted successfully" });
  } catch (error) {
    console.error("Error deleting workspace:", error);
    return NextResponse.json(
      { error: "Failed to delete workspace" },
      { status: 500 }
    );
  }
}
