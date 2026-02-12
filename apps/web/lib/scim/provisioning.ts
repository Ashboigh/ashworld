/**
 * SCIM 2.0 Provisioning Logic
 * Handles user and group provisioning from identity providers
 */

import { prisma } from "@repo/database";
import {
  SCIM_SCHEMAS,
  SCIMUser,
  SCIMGroup,
  SCIMListResponse,
  SCIMError,
  SCIMPatchRequest,
  CreateSCIMUserRequest,
  CreateSCIMGroupRequest,
  SCIMFilter,
} from "./types";
import crypto from "crypto";

const SCIM_PAGE_SIZE = 100;

/**
 * Get the base URL for SCIM resources
 */
function getBaseUrl(organizationId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${appUrl}/api/scim/v2/${organizationId}`;
}

/**
 * Convert database user to SCIM User format
 */
function toSCIMUser(
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
    role?: string;
  },
  organizationId: string
): SCIMUser {
  const baseUrl = getBaseUrl(organizationId);
  const nameParts = (user.name || "").split(" ");

  return {
    schemas: [SCIM_SCHEMAS.USER],
    id: user.id,
    userName: user.email,
    name: {
      givenName: nameParts[0] || undefined,
      familyName: nameParts.slice(1).join(" ") || undefined,
      formatted: user.name || undefined,
    },
    displayName: user.name || user.email,
    emails: [
      {
        value: user.email,
        type: "work",
        primary: true,
      },
    ],
    photos: user.image
      ? [
          {
            value: user.image,
            type: "photo",
            primary: true,
          },
        ]
      : undefined,
    active: true,
    meta: {
      resourceType: "User",
      created: user.createdAt.toISOString(),
      lastModified: user.updatedAt.toISOString(),
      location: `${baseUrl}/Users/${user.id}`,
    },
  };
}

/**
 * Convert database team to SCIM Group format
 */
function toSCIMGroup(
  team: {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    members?: Array<{ user: { id: string; name: string | null } }>;
  },
  organizationId: string
): SCIMGroup {
  const baseUrl = getBaseUrl(organizationId);

  return {
    schemas: [SCIM_SCHEMAS.GROUP],
    id: team.id,
    displayName: team.name,
    members: team.members?.map((m) => ({
      value: m.user.id,
      display: m.user.name || undefined,
      type: "User" as const,
      $ref: `${baseUrl}/Users/${m.user.id}`,
    })),
    meta: {
      resourceType: "Group",
      created: team.createdAt.toISOString(),
      lastModified: team.updatedAt.toISOString(),
      location: `${baseUrl}/Groups/${team.id}`,
    },
  };
}

/**
 * Parse SCIM filter string to structured filter
 */
function parseFilter(filterString: string): SCIMFilter | null {
  // Simple filter parsing: attribute op "value"
  const match = filterString.match(
    /^(\w+(?:\.\w+)?)\s+(eq|ne|co|sw|ew|gt|ge|lt|le|pr)\s*(?:"([^"]*)")?$/i
  );

  if (!match) return null;

  return {
    attribute: match[1].toLowerCase(),
    operator: match[2].toLowerCase() as SCIMFilter["operator"],
    value: match[3],
  };
}

// ============ User Operations ============

/**
 * List users with pagination and filtering
 */
export async function listUsers(
  organizationId: string,
  options: {
    filter?: string;
    startIndex?: number;
    count?: number;
  } = {}
): Promise<SCIMListResponse<SCIMUser>> {
  const startIndex = Math.max(1, options.startIndex || 1);
  const count = Math.min(SCIM_PAGE_SIZE, options.count || SCIM_PAGE_SIZE);
  const skip = startIndex - 1;

  // Build where clause from filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    memberships: {
      some: { organizationId },
    },
  };

  if (options.filter) {
    const parsed = parseFilter(options.filter);
    if (parsed) {
      if (parsed.attribute === "username" || parsed.attribute === "emails.value") {
        if (parsed.operator === "eq") {
          where.email = parsed.value;
        } else if (parsed.operator === "co") {
          where.email = { contains: parsed.value };
        } else if (parsed.operator === "sw") {
          where.email = { startsWith: parsed.value };
        }
      } else if (parsed.attribute === "displayname" || parsed.attribute === "name.formatted") {
        if (parsed.operator === "eq") {
          where.name = parsed.value;
        } else if (parsed.operator === "co") {
          where.name = { contains: parsed.value };
        }
      } else if (parsed.attribute === "active") {
        // All users in our system are active
        // All users in our system are active — no filter needed
      }
    }
  }

  // Get total count
  const totalResults = await prisma.user.count({ where });

  // Get users
  const users = await prisma.user.findMany({
    where,
    skip,
    take: count,
    orderBy: { createdAt: "asc" },
  });

  return {
    schemas: [SCIM_SCHEMAS.LIST_RESPONSE],
    totalResults,
    startIndex,
    itemsPerPage: users.length,
    Resources: users.map((u) => toSCIMUser(u, organizationId)),
  };
}

/**
 * Get a single user by ID
 */
export async function getUser(
  organizationId: string,
  userId: string
): Promise<SCIMUser | SCIMError> {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      memberships: {
        some: { organizationId },
      },
    },
  });

  if (!user) {
    return {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "404",
      detail: "User not found",
    };
  }

  return toSCIMUser(user, organizationId);
}

/**
 * Create a new user
 */
export async function createUser(
  organizationId: string,
  request: CreateSCIMUserRequest
): Promise<SCIMUser | SCIMError> {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: request.userName },
  });

  if (existingUser) {
    // Check if already member of org
    const membership = await prisma.membership.findFirst({
      where: {
        userId: existingUser.id,
        organizationId,
      },
    });

    if (membership) {
      return {
        schemas: [SCIM_SCHEMAS.ERROR],
        status: "409",
        scimType: "uniqueness",
        detail: "User already exists in this organization",
      };
    }

    // Add to organization
    await prisma.membership.create({
      data: {
        userId: existingUser.id,
        organizationId,
        role: "member",
      },
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: existingUser.id },
    });

    return toSCIMUser(updatedUser!, organizationId);
  }

  // Create new user
  const name = request.name
    ? [request.name.givenName, request.name.familyName].filter(Boolean).join(" ")
    : request.displayName || request.userName;

  const user = await prisma.user.create({
    data: {
      email: request.userName,
      name: name || null,
      memberships: {
        create: {
          organizationId,
          role: "member",
        },
      },
    },
  });

  return toSCIMUser(user, organizationId);
}

/**
 * Update a user (full replacement)
 */
export async function updateUser(
  organizationId: string,
  userId: string,
  request: CreateSCIMUserRequest
): Promise<SCIMUser | SCIMError> {
  // Verify user belongs to org
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      organizationId,
    },
  });

  if (!membership) {
    return {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "404",
      detail: "User not found",
    };
  }

  const name = request.name
    ? [request.name.givenName, request.name.familyName].filter(Boolean).join(" ")
    : request.displayName;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      email: request.userName,
      name: name || undefined,
    },
  });

  // Handle deactivation
  if (request.active === false) {
    await prisma.membership.delete({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });
  }

  return toSCIMUser(user, organizationId);
}

/**
 * Patch a user (partial update)
 */
export async function patchUser(
  organizationId: string,
  userId: string,
  request: SCIMPatchRequest
): Promise<SCIMUser | SCIMError> {
  // Verify user belongs to org
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      organizationId,
    },
    include: { user: true },
  });

  if (!membership) {
    return {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "404",
      detail: "User not found",
    };
  }

  // Process operations
  const updateData: { name?: string; email?: string } = {};
  let shouldDeactivate = false;

  for (const op of request.Operations) {
    const path = op.path?.toLowerCase();
    const value = op.value;

    switch (op.op) {
      case "replace":
        if (path === "active" && value === false) {
          shouldDeactivate = true;
        } else if (path === "displayname" || path === "name.formatted") {
          updateData.name = value as string;
        } else if (path === "username" || path === "emails[type eq \"work\"].value") {
          updateData.email = value as string;
        } else if (path === "name.givenname") {
          const current = membership.user.name || "";
          const parts = current.split(" ");
          parts[0] = value as string;
          updateData.name = parts.join(" ");
        } else if (path === "name.familyname") {
          const current = membership.user.name || "";
          const parts = current.split(" ");
          parts[parts.length > 1 ? 1 : 0] = value as string;
          updateData.name = parts.join(" ");
        } else if (!path && typeof value === "object") {
          // Root level update
          const v = value as Record<string, unknown>;
          if (v.active === false) shouldDeactivate = true;
          if (v.displayName) updateData.name = v.displayName as string;
          if (v.userName) updateData.email = v.userName as string;
        }
        break;

      case "remove":
        if (path === "active" || (path === undefined && shouldDeactivate)) {
          shouldDeactivate = true;
        }
        break;

      case "add":
        // Handle add operations same as replace for simple values
        if (path === "displayname") {
          updateData.name = value as string;
        }
        break;
    }
  }

  // Apply updates
  if (Object.keys(updateData).length > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  // Handle deactivation
  if (shouldDeactivate) {
    await prisma.membership.delete({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });
  }

  // Fetch updated user
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "404",
      detail: "User not found after update",
    };
  }

  return toSCIMUser(user, organizationId);
}

/**
 * Delete a user (remove from organization)
 */
export async function deleteUser(
  organizationId: string,
  userId: string
): Promise<void | SCIMError> {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      organizationId,
    },
  });

  if (!membership) {
    return {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "404",
      detail: "User not found",
    };
  }

  // Remove from organization (don't delete the user entirely)
  await prisma.membership.delete({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });
}

// ============ Group Operations ============

/**
 * List groups with pagination and filtering
 */
export async function listGroups(
  organizationId: string,
  options: {
    filter?: string;
    startIndex?: number;
    count?: number;
  } = {}
): Promise<SCIMListResponse<SCIMGroup>> {
  const startIndex = Math.max(1, options.startIndex || 1);
  const count = Math.min(SCIM_PAGE_SIZE, options.count || SCIM_PAGE_SIZE);
  const skip = startIndex - 1;

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    workspace: { organizationId },
  };

  if (options.filter) {
    const parsed = parseFilter(options.filter);
    if (parsed && parsed.attribute === "displayname") {
      if (parsed.operator === "eq") {
        where.name = parsed.value;
      } else if (parsed.operator === "co") {
        where.name = { contains: parsed.value };
      }
    }
  }

  // Get total count
  const totalResults = await prisma.team.count({ where });

  // Get teams with members
  const teams = await prisma.team.findMany({
    where,
    skip,
    take: count,
    orderBy: { createdAt: "asc" },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  return {
    schemas: [SCIM_SCHEMAS.LIST_RESPONSE],
    totalResults,
    startIndex,
    itemsPerPage: teams.length,
    Resources: teams.map((t) => toSCIMGroup(t, organizationId)),
  };
}

/**
 * Get a single group by ID
 */
export async function getGroup(
  organizationId: string,
  groupId: string
): Promise<SCIMGroup | SCIMError> {
  const team = await prisma.team.findFirst({
    where: {
      id: groupId,
      workspace: { organizationId },
    },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!team) {
    return {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "404",
      detail: "Group not found",
    };
  }

  return toSCIMGroup(team, organizationId);
}

/**
 * Create a new group
 */
export async function createGroup(
  organizationId: string,
  workspaceId: string,
  request: CreateSCIMGroupRequest
): Promise<SCIMGroup | SCIMError> {
  // Check if group with same name exists
  const existing = await prisma.team.findFirst({
    where: {
      name: request.displayName,
      workspace: { organizationId },
    },
  });

  if (existing) {
    return {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "409",
      scimType: "uniqueness",
      detail: "Group with this name already exists",
    };
  }

  // Create team
  const team = await prisma.team.create({
    data: {
      name: request.displayName,
      workspaceId,
      members: request.members
        ? {
            create: request.members.map((m) => ({
              userId: m.value,
              role: "member",
            })),
          }
        : undefined,
    },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  return toSCIMGroup(team, organizationId);
}

/**
 * Patch a group (partial update)
 */
export async function patchGroup(
  organizationId: string,
  groupId: string,
  request: SCIMPatchRequest
): Promise<SCIMGroup | SCIMError> {
  const team = await prisma.team.findFirst({
    where: {
      id: groupId,
      workspace: { organizationId },
    },
  });

  if (!team) {
    return {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "404",
      detail: "Group not found",
    };
  }

  for (const op of request.Operations) {
    const path = op.path?.toLowerCase();
    const value = op.value;

    if (op.op === "replace" && path === "displayname") {
      await prisma.team.update({
        where: { id: groupId },
        data: { name: value as string },
      });
    } else if (op.op === "add" && path === "members") {
      // Add members
      const members = Array.isArray(value) ? value : [value];
      for (const member of members) {
        const m = member as { value: string };
        await prisma.teamMember.upsert({
          where: {
            teamId_userId: {
              teamId: groupId,
              userId: m.value,
            },
          },
          create: {
            teamId: groupId,
            userId: m.value,
            role: "member",
          },
          update: {},
        });
      }
    } else if (op.op === "remove" && path?.startsWith("members[")) {
      // Remove specific member: members[value eq "userId"]
      const match = path.match(/members\[value eq "([^"]+)"\]/i);
      if (match) {
        await prisma.teamMember.delete({
          where: {
            teamId_userId: {
              teamId: groupId,
              userId: match[1],
            },
          },
        }).catch(() => {});
      }
    } else if (op.op === "remove" && path === "members") {
      // Remove all members
      await prisma.teamMember.deleteMany({
        where: { teamId: groupId },
      });
    }
  }

  // Fetch updated group
  const updatedTeam = await prisma.team.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!updatedTeam) {
    return {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "404",
      detail: "Group not found after update",
    };
  }

  return toSCIMGroup(updatedTeam, organizationId);
}

/**
 * Delete a group
 */
export async function deleteGroup(
  organizationId: string,
  groupId: string
): Promise<void | SCIMError> {
  const team = await prisma.team.findFirst({
    where: {
      id: groupId,
      workspace: { organizationId },
    },
  });

  if (!team) {
    return {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "404",
      detail: "Group not found",
    };
  }

  // Delete team members first
  await prisma.teamMember.deleteMany({
    where: { teamId: groupId },
  });

  // Delete team
  await prisma.team.delete({
    where: { id: groupId },
  });
}

// ============ Authentication ============

/**
 * Verify SCIM bearer token
 */
export async function verifySCIMToken(
  organizationId: string,
  token: string
): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!org) return false;

  // Get SCIM config from settings
  const settings = org.settings as Record<string, unknown> | null;
  const scimConfig = settings?.scim as { enabled?: boolean; bearerToken?: string } | undefined;

  if (!scimConfig?.enabled || !scimConfig.bearerToken) {
    return false;
  }

  // Constant-time comparison
  const expected = scimConfig.bearerToken;
  if (token.length !== expected.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(expected)
  );
}

/**
 * Generate a new SCIM bearer token
 */
export function generateSCIMToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}
