import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import {
  getOrganizationMemberRole,
  createAuditLog,
} from "@/lib/organization";
import { hasPermission, Permission, canManageRole, OrgRoleType } from "@/lib/permissions";
import { inviteMemberSchema } from "@/lib/validations/organization";
import { generateToken, getTokenExpiry } from "@/lib/tokens";
import { sendEmail } from "@/lib/email";
import { checkOrganizationLimit } from "@/lib/billing";

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

// GET /api/organizations/[orgId]/members - List members
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

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId },
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
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}

// POST /api/organizations/[orgId]/members - Invite member
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = await getOrganizationMemberRole(orgId, session.user.id);

    if (!userRole || !hasPermission(userRole, Permission.ORG_MANAGE_MEMBERS)) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    // Check member limit
    const limitCheck = await checkOrganizationLimit(orgId, "members");
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: "Member limit reached",
          code: "LIMIT_EXCEEDED",
          details: {
            resource: "members",
            current: limitCheck.currentUsage,
            limit: limitCheck.limit,
            message: limitCheck.upgradeMessage,
          },
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = inviteMemberSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { email, role } = result.data;

    // Check if user can assign this role
    if (!canManageRole(userRole, role as OrgRoleType)) {
      return NextResponse.json(
        { error: "You cannot assign a role equal to or higher than your own" },
        { status: 403 }
      );
    }

    // Check if user already exists in the system
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Check if already a member
    if (existingUser) {
      const existingMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: existingUser.id,
          },
        },
      });

      if (existingMember) {
        return NextResponse.json(
          { error: "This user is already a member of the organization" },
          { status: 409 }
        );
      }
    }

    // Check for pending invitation
    const pendingInvitation = await prisma.invitation.findFirst({
      where: {
        organizationId: orgId,
        email: email.toLowerCase(),
        status: "pending",
        expiresAt: { gt: new Date() },
      },
    });

    if (pendingInvitation) {
      return NextResponse.json(
        { error: "A pending invitation already exists for this email" },
        { status: 409 }
      );
    }

    // Get organization details
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Create invitation
    const token = generateToken();
    const invitation = await prisma.invitation.create({
      data: {
        email: email.toLowerCase(),
        organizationId: orgId,
        role,
        token,
        expiresAt: getTokenExpiry(168), // 7 days
        invitedById: session.user.id,
      },
    });

    // Send invitation email
    const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${token}`;
    await sendEmail({
      to: email,
      subject: `You've been invited to join ${organization.name}`,
      html: `
        <h1>You've been invited!</h1>
        <p>You've been invited to join <strong>${organization.name}</strong> as a <strong>${role.replace("_", " ")}</strong>.</p>
        <p><a href="${inviteUrl}">Click here to accept the invitation</a></p>
        <p>This invitation will expire in 7 days.</p>
        <p>If you didn't expect this invitation, you can safely ignore this email.</p>
      `,
    });

    // Create audit log
    await createAuditLog({
      organizationId: orgId,
      userId: session.user.id,
      action: "member.invited",
      resourceType: "invitation",
      resourceId: invitation.id,
      newValues: { email, role },
    });

    return NextResponse.json(
      { message: "Invitation sent successfully", invitationId: invitation.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error inviting member:", error);
    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 }
    );
  }
}
