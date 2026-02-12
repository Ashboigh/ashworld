import { prisma } from "@repo/database";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { OrgRoleType, hasPermission, PermissionType } from "./permissions";

export interface OrganizationWithRole {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: OrgRoleType;
}

export interface WorkspaceWithRole {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  organizationId: string;
  role: string;
}

// Get user's organizations with their roles
export async function getUserOrganizations(
  userId: string
): Promise<OrganizationWithRole[]> {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    include: {
      organization: true,
    },
    orderBy: {
      organization: {
        name: "asc",
      },
    },
  });

  return memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    logoUrl: m.organization.logoUrl,
    role: m.role as OrgRoleType,
  }));
}

// Get organization by slug with user's role
export async function getOrganizationBySlug(
  slug: string,
  userId: string
): Promise<{
  organization: OrganizationWithRole & { settings: unknown };
  membership: { role: OrgRoleType };
} | { organization: null; membership: null }> {
  const membershipRecord = await prisma.organizationMember.findFirst({
    where: {
      userId,
      organization: {
        slug,
      },
    },
    include: {
      organization: true,
    },
  });

  if (!membershipRecord) {
    return { organization: null, membership: null };
  }

  return {
    organization: {
      id: membershipRecord.organization.id,
      name: membershipRecord.organization.name,
      slug: membershipRecord.organization.slug,
      logoUrl: membershipRecord.organization.logoUrl,
      settings: membershipRecord.organization.settings,
      role: membershipRecord.role as OrgRoleType,
    },
    membership: {
      role: membershipRecord.role as OrgRoleType,
    },
  };
}

// Get organization member role
export async function getOrganizationMemberRole(
  organizationId: string,
  userId: string
): Promise<OrgRoleType | null> {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  });

  return membership?.role as OrgRoleType | null;
}

// Check if user has permission in organization
export async function checkOrganizationPermission(
  organizationId: string,
  userId: string,
  permission: PermissionType
): Promise<boolean> {
  const role = await getOrganizationMemberRole(organizationId, userId);
  if (!role) return false;
  return hasPermission(role, permission);
}

// Get organization members
export async function getOrganizationMembers(organizationId: string) {
  return prisma.organizationMember.findMany({
    where: { organizationId },
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
}

// Get workspaces for organization
export async function getOrganizationWorkspaces(
  organizationId: string,
  userId: string
): Promise<WorkspaceWithRole[]> {
  // Get user's org role
  const orgMembership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  });

  if (!orgMembership) return [];

  // Org admins and workspace admins can see all workspaces
  if (
    orgMembership.role === "org_admin" ||
    orgMembership.role === "workspace_admin"
  ) {
    const workspaces = await prisma.workspace.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });

    return workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      description: w.description,
      organizationId: w.organizationId,
      role: orgMembership.role,
    }));
  }

  // Others only see workspaces they're members of
  const workspaceMembers = await prisma.workspaceMember.findMany({
    where: {
      userId,
      workspace: {
        organizationId,
      },
    },
    include: {
      workspace: true,
    },
    orderBy: {
      workspace: {
        name: "asc",
      },
    },
  });

  return workspaceMembers.map((wm) => ({
    id: wm.workspace.id,
    name: wm.workspace.name,
    slug: wm.workspace.slug,
    description: wm.workspace.description,
    organizationId: wm.workspace.organizationId,
    role: wm.role,
  }));
}

// Generate unique slug
export async function generateUniqueSlug(
  baseName: string,
  type: "organization" | "workspace",
  organizationId?: string
): Promise<string> {
  const baseSlug = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  let slug = baseSlug;
  let counter = 1;
  let exists = true;

  while (exists) {
    const found =
      type === "organization"
        ? await prisma.organization.findUnique({ where: { slug } })
        : await prisma.workspace.findFirst({
            where: { slug, organizationId },
          });

    if (!found) {
      exists = false;
    } else {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  return slug;
}

// Create audit log
export async function createAuditLog({
  organizationId,
  userId,
  action,
  resourceType,
  resourceId,
  oldValues,
  newValues,
  ipAddress,
  userAgent,
}: {
  organizationId: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string;
  userAgent?: string;
}) {
  return prisma.auditLog.create({
    data: {
      organizationId,
      userId,
      action,
      resourceType,
      resourceId,
      oldValues: oldValues as object,
      newValues: newValues as object,
      ipAddress,
      userAgent,
    },
  });
}

// Server-side helper to get current user's organization context
export async function getServerOrganizationContext(orgSlug: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401 };
  }

  const { organization, membership } = await getOrganizationBySlug(orgSlug, session.user.id);

  if (!organization || !membership) {
    return { error: "Organization not found or access denied", status: 404 };
  }

  return {
    session,
    organization,
    membership,
    userId: session.user.id,
    role: membership.role,
  };
}
