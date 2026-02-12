import { prisma } from "@repo/database";
import { paystackGet, paystackPost } from "../paystack";

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

interface PaystackCustomer {
  id: number;
  customer_code: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  metadata: Record<string, unknown>;
}

interface PaystackSubscription {
  id: number;
  subscription_code: string;
  status: string;
  amount: number;
  plan: {
    plan_code: string;
    name: string;
    interval: string;
  };
  email_token: string;
  next_payment_date: string | null;
  createdAt: string;
}

interface PaystackTransaction {
  id: number;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

/**
 * Get or create a Paystack customer for an organization
 */
export async function getOrCreatePaystackCustomer(
  organizationId: string,
  email: string,
  name?: string
): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { paystackCustomerCode: true, name: true },
  });

  if (org?.paystackCustomerCode) {
    return org.paystackCustomerCode;
  }

  const nameParts = (name || org?.name || "").split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  const res = await paystackPost<PaystackResponse<PaystackCustomer>>("/customer", {
    email,
    first_name: firstName,
    last_name: lastName,
    metadata: { organizationId },
  });

  const customerCode = res.data.customer_code;

  await prisma.organization.update({
    where: { id: organizationId },
    data: { paystackCustomerCode: customerCode },
  });

  return customerCode;
}

/**
 * Update Paystack customer information
 */
export async function updatePaystackCustomer(
  customerCode: string,
  data: { first_name?: string; last_name?: string; phone?: string }
): Promise<void> {
  await paystackPost(`/customer/${customerCode}`, data as Record<string, unknown>);
}

/**
 * Get Paystack customer by code
 */
export async function getPaystackCustomer(
  customerCode: string
): Promise<PaystackCustomer | null> {
  try {
    const res = await paystackGet<PaystackResponse<PaystackCustomer>>(
      `/customer/${customerCode}`
    );
    return res.data;
  } catch {
    return null;
  }
}

/**
 * Get subscription details from Paystack
 */
export async function getPaystackSubscription(
  subscriptionCode: string
): Promise<PaystackSubscription | null> {
  try {
    const res = await paystackGet<PaystackResponse<PaystackSubscription>>(
      `/subscription/${subscriptionCode}`
    );
    return res.data;
  } catch {
    return null;
  }
}

/**
 * Sync subscription data from Paystack to database
 */
export async function syncSubscriptionFromPaystack(
  subscriptionCode: string
): Promise<void> {
  const subscription = await getPaystackSubscription(subscriptionCode);
  if (!subscription) return;

  // Find organization by subscription code or customer
  const org = await prisma.organization.findFirst({
    where: { paystackSubscriptionCode: subscriptionCode },
  });

  if (!org) return;

  // Match plan by plan code
  const planCode = subscription.plan.plan_code;
  const plan = await prisma.plan.findFirst({
    where: {
      OR: [
        { paystackPlanCodeMonthly: planCode },
        { paystackPlanCodeYearly: planCode },
      ],
    },
  });

  // Determine billing interval from Paystack plan interval
  const interval = subscription.plan.interval;
  const billingInterval =
    interval === "annually" || interval === "yearly" ? "yearly" : "monthly";

  // Map Paystack status to our status
  const statusMap: Record<string, string> = {
    active: "active",
    "non-renewing": "active",
    attention: "past_due",
    completed: "canceled",
    cancelled: "canceled",
  };

  const subscriptionStatus = statusMap[subscription.status] || subscription.status;

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      paystackSubscriptionCode: subscription.subscription_code,
      subscriptionStatus,
      billingInterval,
      planId: plan?.id || org.planId,
      currentPeriodEnd: subscription.next_payment_date
        ? new Date(subscription.next_payment_date)
        : null,
      cancelAtPeriodEnd: subscription.status === "non-renewing",
    },
  });
}

/**
 * Cancel a subscription (disable at end of period)
 */
export async function cancelPaystackSubscription(
  subscriptionCode: string,
  emailToken: string
): Promise<void> {
  await paystackPost("/subscription/disable", {
    code: subscriptionCode,
    token: emailToken,
  });
}

/**
 * Reactivate a cancelled subscription
 */
export async function reactivatePaystackSubscription(
  subscriptionCode: string,
  emailToken: string
): Promise<void> {
  await paystackPost("/subscription/enable", {
    code: subscriptionCode,
    token: emailToken,
  });
}

/**
 * Get transactions for a customer
 */
export async function getPaystackTransactions(
  customerIdOrCode: string | number,
  limit: number = 10
): Promise<PaystackTransaction[]> {
  const res = await paystackGet<PaystackResponse<PaystackTransaction[]>>(
    `/transaction?customer=${customerIdOrCode}&perPage=${limit}`
  );
  return res.data;
}
