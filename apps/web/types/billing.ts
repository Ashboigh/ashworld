import type { Plan, Organization, BillingHistory } from "@repo/database";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired";

export type BillingInterval = "monthly" | "yearly";

export interface BillingInfo {
  plan: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    priceMonthly: number;
    priceYearly: number;
    limits: PlanLimitsJson;
    features: PlanFeaturesJson;
  } | null;
  subscription: {
    status: SubscriptionStatus | null;
    interval: BillingInterval | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
  };
  trial: {
    isActive: boolean;
    endsAt: Date | null;
    daysRemaining: number;
  };
  usage: UsageData;
}

export interface PlanLimitsJson {
  messages: number;
  workspaces: number;
  chatbots: number;
  members: number;
  knowledgeBases: number;
  documentsPerKb: number;
}

export interface PlanFeaturesJson {
  customBranding: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  sso: boolean;
  analytics: "basic" | "advanced";
  whitelabel: boolean;
}

export interface UsageData {
  messages: UsageItem;
  workspaces: UsageItem;
  chatbots: UsageItem;
  members: UsageItem;
  knowledgeBases: UsageItem;
}

export interface UsageItem {
  used: number;
  limit: number;
  percentage: number;
}

export interface BillingHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  invoiceUrl: string | null;
  invoicePdf: string | null;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
}

export interface CheckoutSessionRequest {
  organizationId: string;
  planSlug: string;
  billingInterval: BillingInterval;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface PortalSessionRequest {
  organizationId: string;
  returnUrl?: string;
}

export interface PortalSessionResponse {
  url: string;
}

// Serialized types for API responses (dates as strings)
export interface SerializedBillingInfo {
  plan: BillingInfo["plan"];
  subscription: {
    status: SubscriptionStatus | null;
    interval: BillingInterval | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  };
  trial: {
    isActive: boolean;
    endsAt: string | null;
    daysRemaining: number;
  };
  usage: UsageData;
}

export interface SerializedBillingHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  invoiceUrl: string | null;
  invoicePdf: string | null;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

// Re-export Prisma types
export type { Plan, Organization, BillingHistory };
