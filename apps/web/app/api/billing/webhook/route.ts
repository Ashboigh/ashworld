import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@repo/database";
import { syncSubscriptionFromPaystack } from "@/lib/billing";

interface PaystackEvent {
  event: string;
  data: Record<string, unknown>;
}

function verifyPaystackSignature(body: string, signature: string): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return false;
  const hash = createHmac("sha512", secret).update(body).digest("hex");
  return hash === signature;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!signature || !verifyPaystackSignature(body, signature)) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    switch (event.event) {
      case "charge.success":
        await handleChargeSuccess(event.data);
        break;

      case "subscription.create":
        await handleSubscriptionCreate(event.data);
        break;

      case "subscription.not_renew":
        await handleSubscriptionNotRenew(event.data);
        break;

      case "subscription.disable":
        await handleSubscriptionDisable(event.data);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data);
        break;

      default:
        console.log(`Unhandled Paystack event: ${event.event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleChargeSuccess(data: Record<string, unknown>) {
  const metadata = data.metadata as Record<string, unknown> | undefined;
  const organizationId = metadata?.organizationId as string | undefined;
  const planSlug = metadata?.planSlug as string | undefined;
  const reference = data.reference as string;
  const amount = data.amount as number;
  const currency = data.currency as string;
  const customerCode = (data.customer as Record<string, unknown>)?.customer_code as string | undefined;

  if (!organizationId) {
    if (!customerCode) {
      console.error("No organizationId in metadata and no customer code");
      return;
    }
    const org = await prisma.organization.findFirst({
      where: { paystackCustomerCode: customerCode },
    });
    if (!org) {
      console.error(`No organization found for customer ${customerCode}`);
      return;
    }
    await recordBillingHistory(org.id, reference, amount, currency, "paid");
    return;
  }

  // Update plan if specified
  if (planSlug) {
    const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
    if (plan) {
      await prisma.organization.update({
        where: { id: organizationId },
        data: { planId: plan.id, subscriptionStatus: "active" },
      });
    }
  }

  // Record billing history
  await recordBillingHistory(organizationId, reference, amount, currency, "paid");

  // Reset monthly usage on successful payment
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      messagesUsedThisMonth: 0,
      usageResetAt: new Date(),
    },
  });

  console.log(`Charge successful for organization ${organizationId}`);
}

async function handleSubscriptionCreate(data: Record<string, unknown>) {
  const subscriptionCode = data.subscription_code as string;
  const customerCode = (data.customer as Record<string, unknown>)?.customer_code as string | undefined;

  if (!customerCode) {
    console.error("No customer code in subscription.create event");
    return;
  }

  const org = await prisma.organization.findFirst({
    where: { paystackCustomerCode: customerCode },
  });

  if (!org) {
    console.error(`No organization found for customer ${customerCode}`);
    return;
  }

  await prisma.organization.update({
    where: { id: org.id },
    data: { paystackSubscriptionCode: subscriptionCode },
  });

  await syncSubscriptionFromPaystack(subscriptionCode);
  console.log(`Subscription ${subscriptionCode} created for org ${org.id}`);
}

async function handleSubscriptionNotRenew(data: Record<string, unknown>) {
  const subscriptionCode = data.subscription_code as string;

  const org = await prisma.organization.findFirst({
    where: { paystackSubscriptionCode: subscriptionCode },
  });

  if (!org) {
    console.error(`No organization found for subscription ${subscriptionCode}`);
    return;
  }

  await prisma.organization.update({
    where: { id: org.id },
    data: { cancelAtPeriodEnd: true },
  });

  console.log(`Subscription ${subscriptionCode} set to not renew for org ${org.id}`);
}

async function handleSubscriptionDisable(data: Record<string, unknown>) {
  const subscriptionCode = data.subscription_code as string;

  const org = await prisma.organization.findFirst({
    where: { paystackSubscriptionCode: subscriptionCode },
  });

  if (!org) {
    console.error(`No organization found for subscription ${subscriptionCode}`);
    return;
  }

  const freePlan = await prisma.plan.findUnique({ where: { slug: "free" } });

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      paystackSubscriptionCode: null,
      subscriptionStatus: "canceled",
      planId: freePlan?.id || null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    },
  });

  console.log(`Subscription disabled, org ${org.id} reverted to free plan`);
}

async function handleInvoicePaymentFailed(data: Record<string, unknown>) {
  const subscriptionCode = (data.subscription as Record<string, unknown>)?.subscription_code as string | undefined;

  if (!subscriptionCode) return;

  const org = await prisma.organization.findFirst({
    where: { paystackSubscriptionCode: subscriptionCode },
  });

  if (!org) return;

  await prisma.organization.update({
    where: { id: org.id },
    data: { subscriptionStatus: "past_due" },
  });

  const reference = data.reference as string | undefined;
  const amount = data.amount as number | undefined;
  const currency = data.currency as string | undefined;

  if (reference) {
    await recordBillingHistory(
      org.id,
      reference,
      amount || 0,
      currency || "NGN",
      "failed"
    );
  }

  console.log(`Invoice payment failed for org ${org.id}`);
}

async function recordBillingHistory(
  organizationId: string,
  reference: string,
  amount: number,
  currency: string,
  status: string
) {
  const now = new Date();
  await prisma.billingHistory.upsert({
    where: { paystackReference: reference },
    update: {
      amount,
      status,
    },
    create: {
      organizationId,
      paystackReference: reference,
      amount,
      currency: currency.toLowerCase(),
      status,
      description: `Payment ${reference}`,
      periodStart: now,
      periodEnd: now,
    },
  });
}
