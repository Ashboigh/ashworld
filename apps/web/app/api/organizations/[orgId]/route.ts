import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma, Prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { updateOrganizationSchema } from "@/lib/validations/organization";
import {
  getOrganizationMemberRole,
  createAuditLog,
} from "@/lib/organization";
import { hasPermission, Permission } from "@/lib/permissions";

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

// GET /api/organizations/[orgId] - Get organization details
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getOrganizationMemberRole(orgId, session.user.id);

    if (!role) {
      return NextResponse.json(
        { error: "Organization not found or access denied" },
        { status: 404 }
      );
    }

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: {
            members: true,
            workspaces: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...organization,
      role,
      memberCount: organization._count.members,
      workspaceCount: organization._count.workspaces,
    });
  } catch (error) {
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization" },
      { status: 500 }
    );
  }
}

// PATCH /api/organizations/[orgId] - Update organization
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getOrganizationMemberRole(orgId, session.user.id);

    if (!role || !hasPermission(role, Permission.ORG_UPDATE)) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = updateOrganizationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const oldOrganization = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    const organization = await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...result.data,
        settings: result.data.settings as Prisma.InputJsonValue | undefined,
      },
    });

    // Create audit log
    await createAuditLog({
      organizationId: orgId,
      userId: session.user.id,
      action: "organization.updated",
      resourceType: "organization",
      resourceId: orgId,
      oldValues: oldOrganization,
      newValues: organization,
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.error("Error updating organization:", error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/[orgId] - Delete organization
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getOrganizationMemberRole(orgId, session.user.id);

    if (!role || !hasPermission(role, Permission.ORG_DELETE)) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    await prisma.organization.delete({
      where: { id: orgId },
    });

    return NextResponse.json({ message: "Organization deleted successfully" });
  } catch (error) {
    console.error("Error deleting organization:", error);
    return NextResponse.json(
      { error: "Failed to delete organization" },
      { status: 500 }
    );
  }
}
