import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import {
  getOrganizationMemberRole,
  createAuditLog,
} from "@/lib/organization";
import {
  hasPermission,
  Permission,
  canManageRole,
  OrgRoleType,
} from "@/lib/permissions";
import { updateMemberRoleSchema } from "@/lib/validations/organization";

interface RouteParams {
  params: Promise<{ orgId: string; memberId: string }>;
}

// PATCH /api/organizations/[orgId]/members/[memberId] - Update member role
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, memberId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = await getOrganizationMemberRole(orgId, session.user.id);

    if (!userRole || !hasPermission(userRole, Permission.ORG_MANAGE_MEMBERS)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = await request.json();
    const result = updateMemberRoleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { role: newRole } = result.data;

    // Get the target member
    const targetMember = await prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.organizationId !== orgId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Cannot change your own role
    if (targetMember.userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 403 }
      );
    }

    // Check if user can manage the target's current role
    if (!canManageRole(userRole, targetMember.role as OrgRoleType)) {
      return NextResponse.json(
        { error: "You cannot manage members with this role" },
        { status: 403 }
      );
    }

    // Check if user can assign the new role
    if (!canManageRole(userRole, newRole as OrgRoleType)) {
      return NextResponse.json(
        { error: "You cannot assign this role" },
        { status: 403 }
      );
    }

    const oldRole = targetMember.role;

    const updatedMember = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: newRole },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            image: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      organizationId: orgId,
      userId: session.user.id,
      action: "member.role_updated",
      resourceType: "organization_member",
      resourceId: memberId,
      oldValues: { role: oldRole },
      newValues: { role: newRole },
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error("Error updating member role:", error);
    return NextResponse.json(
      { error: "Failed to update member role" },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/[orgId]/members/[memberId] - Remove member
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, memberId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = await getOrganizationMemberRole(orgId, session.user.id);

    if (!userRole || !hasPermission(userRole, Permission.ORG_MANAGE_MEMBERS)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Get the target member
    const targetMember = await prisma.organizationMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!targetMember || targetMember.organizationId !== orgId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Cannot remove yourself
    if (targetMember.userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot remove yourself from the organization" },
        { status: 403 }
      );
    }

    // Check if user can manage the target's role
    if (!canManageRole(userRole, targetMember.role as OrgRoleType)) {
      return NextResponse.json(
        { error: "You cannot remove members with this role" },
        { status: 403 }
      );
    }

    // Check if this is the last admin
    if (targetMember.role === "org_admin") {
      const adminCount = await prisma.organizationMember.count({
        where: {
          organizationId: orgId,
          role: "org_admin",
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last organization admin" },
          { status: 400 }
        );
      }
    }

    await prisma.organizationMember.delete({
      where: { id: memberId },
    });

    // Also remove from all workspaces in this organization
    await prisma.workspaceMember.deleteMany({
      where: {
        userId: targetMember.userId,
        workspace: {
          organizationId: orgId,
        },
      },
    });

    // Create audit log
    await createAuditLog({
      organizationId: orgId,
      userId: session.user.id,
      action: "member.removed",
      resourceType: "organization_member",
      resourceId: memberId,
      oldValues: {
        userId: targetMember.userId,
        email: targetMember.user.email,
        role: targetMember.role,
      },
    });

    return NextResponse.json({ message: "Member removed successfully" });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
