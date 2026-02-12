export type PlanSlug = "free" | "starter" | "professional" | "enterprise";

export interface PlanLimits {
  messages: number;
  workspaces: number;
  chatbots: number;
  members: number;
  knowledgeBases: number;
  documentsPerKb: number;
}

export interface PlanFeatures {
  customBranding: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  sso: boolean;
  analytics: "basic" | "advanced";
  whitelabel: boolean;
}

export const PLAN_LIMITS: Record<PlanSlug, PlanLimits> = {
  free: {
    messages: 100,
    workspaces: 1,
    chatbots: 1,
    members: 2,
    knowledgeBases: 1,
    documentsPerKb: 5,
  },
  starter: {
    messages: 1000,
    workspaces: 3,
    chatbots: 5,
    members: 5,
    knowledgeBases: 3,
    documentsPerKb: 20,
  },
  professional: {
    messages: 10000,
    workspaces: 10,
    chatbots: 20,
    members: 20,
    knowledgeBases: 10,
    documentsPerKb: 100,
  },
  enterprise: {
    messages: -1, // unlimited
    workspaces: -1,
    chatbots: -1,
    members: -1,
    knowledgeBases: -1,
    documentsPerKb: -1,
  },
} as const;

export const PLAN_FEATURES: Record<PlanSlug, PlanFeatures> = {
  free: {
    customBranding: false,
    apiAccess: false,
    prioritySupport: false,
    sso: false,
    analytics: "basic",
    whitelabel: false,
  },
  starter: {
    customBranding: true,
    apiAccess: false,
    prioritySupport: false,
    sso: false,
    analytics: "basic",
    whitelabel: false,
  },
  professional: {
    customBranding: true,
    apiAccess: true,
    prioritySupport: true,
    sso: false,
    analytics: "advanced",
    whitelabel: false,
  },
  enterprise: {
    customBranding: true,
    apiAccess: true,
    prioritySupport: true,
    sso: true,
    analytics: "advanced",
    whitelabel: true,
  },
} as const;

export const PLAN_DISPLAY_NAMES: Record<PlanSlug, string> = {
  free: "Free",
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

export const TRIAL_PERIOD_DAYS = 14;
export const DEFAULT_TRIAL_PLAN: PlanSlug = "professional";

/**
 * Check if a limit value represents unlimited
 */
export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

/**
 * Format a limit value for display
 */
export function formatLimit(limit: number): string {
  if (isUnlimited(limit)) {
    return "Unlimited";
  }
  return limit.toLocaleString();
}

/**
 * Format price for display
 */
export function formatPrice(cents: number, interval?: "monthly" | "yearly"): string {
  const dollars = cents / 100;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars);

  if (!interval) {
    return formatted;
  }
  return interval === "yearly" ? `${formatted}/year` : `${formatted}/month`;
}

/**
 * Get the next upgrade plan from current plan
 */
export function getNextPlan(currentSlug: PlanSlug): PlanSlug | null {
  const order: PlanSlug[] = ["free", "starter", "professional", "enterprise"];
  const currentIndex = order.indexOf(currentSlug);
  if (currentIndex === -1 || currentIndex === order.length - 1) {
    return null;
  }
  return order[currentIndex + 1] ?? null;
}

/**
 * Check if plan A is higher tier than plan B
 */
export function isPlanHigherTier(planA: PlanSlug, planB: PlanSlug): boolean {
  const order: PlanSlug[] = ["free", "starter", "professional", "enterprise"];
  return order.indexOf(planA) > order.indexOf(planB);
}
