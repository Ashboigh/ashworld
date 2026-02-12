import { prisma } from "@repo/database";
import { PLAN_LIMITS, isUnlimited, type PlanSlug, type PlanLimits } from "./plans";

export type ResourceType =
  | "messages"
  | "workspaces"
  | "chatbots"
  | "members"
  | "knowledgeBases";

export interface LimitCheckResult {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  resource: ResourceType;
  upgradeMessage?: string;
}

/**
 * Get the current plan limits for an organization
 */
export async function getOrganizationLimits(
  organizationId: string
): Promise<PlanLimits> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { plan: true },
  });

  if (!org?.plan) {
    // Default to free plan limits if no plan assigned
    return PLAN_LIMITS.free;
  }

  // Use plan limits from database if available, otherwise use constants
  const planSlug = org.plan.slug as PlanSlug;
  const dbLimits = org.plan.limits as Record<string, number> | null;

  if (dbLimits && typeof dbLimits === "object") {
    return {
      messages: dbLimits.messages ?? PLAN_LIMITS[planSlug]?.messages ?? 100,
      workspaces: dbLimits.workspaces ?? PLAN_LIMITS[planSlug]?.workspaces ?? 1,
      chatbots: dbLimits.chatbots ?? PLAN_LIMITS[planSlug]?.chatbots ?? 1,
      members: dbLimits.members ?? PLAN_LIMITS[planSlug]?.members ?? 2,
      knowledgeBases: dbLimits.knowledgeBases ?? PLAN_LIMITS[planSlug]?.knowledgeBases ?? 1,
      documentsPerKb: dbLimits.documentsPerKb ?? PLAN_LIMITS[planSlug]?.documentsPerKb ?? 5,
    };
  }

  return PLAN_LIMITS[planSlug] || PLAN_LIMITS.free;
}

/**
 * Get current resource usage for an organization
 */
export async function getOrganizationUsage(organizationId: string): Promise<{
  messages: number;
  workspaces: number;
  chatbots: number;
  members: number;
  knowledgeBases: number;
}> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      _count: {
        select: {
          members: true,
          workspaces: true,
        },
      },
      workspaces: {
        include: {
          _count: {
            select: {
              chatbots: true,
              knowledgeBases: true,
            },
          },
        },
      },
    },
  });

  if (!org) {
    return {
      messages: 0,
      workspaces: 0,
      chatbots: 0,
      members: 0,
      knowledgeBases: 0,
    };
  }

  // Calculate totals across all workspaces
  const chatbots = org.workspaces.reduce((sum, ws) => sum + ws._count.chatbots, 0);
  const knowledgeBases = org.workspaces.reduce((sum, ws) => sum + ws._count.knowledgeBases, 0);

  return {
    messages: org.messagesUsedThisMonth,
    workspaces: org._count.workspaces,
    chatbots,
    members: org._count.members,
    knowledgeBases,
  };
}

/**
 * Check if an organization can create/use more of a resource
 */
export async function checkOrganizationLimit(
  organizationId: string,
  resource: ResourceType
): Promise<LimitCheckResult> {
  const [limits, usage] = await Promise.all([
    getOrganizationLimits(organizationId),
    getOrganizationUsage(organizationId),
  ]);

  const limit = limits[resource];
  const currentUsage = usage[resource];

  // Unlimited check
  if (isUnlimited(limit)) {
    return {
      allowed: true,
      currentUsage,
      limit,
      resource,
    };
  }

  const allowed = currentUsage < limit;

  return {
    allowed,
    currentUsage,
    limit,
    resource,
    upgradeMessage: allowed
      ? undefined
      : `You've reached the ${resource} limit (${currentUsage}/${limit}). Upgrade your plan for more.`,
  };
}

/**
 * Quick check if organization can create a resource (returns boolean only)
 */
export async function canCreateResource(
  organizationId: string,
  resource: ResourceType
): Promise<boolean> {
  const result = await checkOrganizationLimit(organizationId, resource);
  return result.allowed;
}

/**
 * Get all limits and usage for an organization (for billing UI)
 */
export async function getOrganizationBillingStatus(organizationId: string): Promise<{
  limits: PlanLimits;
  usage: Awaited<ReturnType<typeof getOrganizationUsage>>;
  percentages: Record<ResourceType, number>;
}> {
  const [limits, usage] = await Promise.all([
    getOrganizationLimits(organizationId),
    getOrganizationUsage(organizationId),
  ]);

  const calculatePercentage = (used: number, limit: number): number => {
    if (isUnlimited(limit)) return 0;
    if (limit === 0) return 100;
    return Math.round((used / limit) * 100);
  };

  return {
    limits,
    usage,
    percentages: {
      messages: calculatePercentage(usage.messages, limits.messages),
      workspaces: calculatePercentage(usage.workspaces, limits.workspaces),
      chatbots: calculatePercentage(usage.chatbots, limits.chatbots),
      members: calculatePercentage(usage.members, limits.members),
      knowledgeBases: calculatePercentage(usage.knowledgeBases, limits.knowledgeBases),
    },
  };
}
