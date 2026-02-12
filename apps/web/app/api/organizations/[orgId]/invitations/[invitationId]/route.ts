import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { getOrganizationMemberRole, createAuditLog } from "@/lib/organization";
import { hasPermission, Permission } from "@/lib/permissions";

interface RouteParams {
  params: Promise<{ orgId: string; invitationId: string }>;
}

// DELETE /api/organizations/[orgId]/invitations/[invitationId] - Cancel invitation
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, invitationId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getOrganizationMemberRole(orgId, session.user.id);

    if (!role || !hasPermission(role, Permission.ORG_MANAGE_MEMBERS)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        organizationId: orgId,
        status: "pending",
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: "cancelled" },
    });

    // Create audit log
    await createAuditLog({
      organizationId: orgId,
      userId: session.user.id,
      action: "invitation.cancelled",
      resourceType: "invitation",
      resourceId: invitationId,
      oldValues: { email: invitation.email, role: invitation.role },
    });

    return NextResponse.json({ message: "Invitation cancelled" });
  } catch (error) {
    console.error("Error cancelling invitation:", error);
    return NextResponse.json(
      { error: "Failed to cancel invitation" },
      { status: 500 }
    );
  }
}
