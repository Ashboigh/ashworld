import { prisma } from "@repo/database";

/**
 * Increment message usage for an organization
 */
export async function incrementMessageUsage(
  organizationId: string,
  count: number = 1
): Promise<void> {
  // Check if we need to reset usage (new billing period)
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      usageResetAt: true,
      currentPeriodEnd: true,
    },
  });

  const now = new Date();
  const shouldReset =
    org?.usageResetAt && org.currentPeriodEnd
      ? now >= org.currentPeriodEnd
      : false;

  if (shouldReset) {
    // Reset usage and set new reset date
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        messagesUsedThisMonth: count,
        usageResetAt: now,
      },
    });
  } else {
    // Just increment
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        messagesUsedThisMonth: {
          increment: count,
        },
      },
    });
  }
}

/**
 * Reset monthly usage for an organization
 */
export async function resetMonthlyUsage(organizationId: string): Promise<void> {
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      messagesUsedThisMonth: 0,
      usageResetAt: new Date(),
    },
  });
}

/**
 * Get the current usage period dates
 */
export async function getUsagePeriod(organizationId: string): Promise<{
  start: Date;
  end: Date;
}> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      usageResetAt: true,
      currentPeriodEnd: true,
      createdAt: true,
    },
  });

  const now = new Date();
  const start = org?.usageResetAt || org?.createdAt || now;
  const end = org?.currentPeriodEnd || addDays(start, 30);

  return { start, end };
}

/**
 * Helper to add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Check if organization is within their message limit
 */
export async function checkMessageLimit(organizationId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { plan: true },
  });

  if (!org) {
    return { allowed: false, used: 0, limit: 0, remaining: 0 };
  }

  const used = org.messagesUsedThisMonth;
  const limits = org.plan?.limits as Record<string, number> | null;
  const limit = limits?.messages ?? 100; // Default to free plan limit

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, used, limit: -1, remaining: -1 };
  }

  const remaining = Math.max(0, limit - used);
  const allowed = used < limit;

  return { allowed, used, limit, remaining };
}
