import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { paystackPost } from "@/lib/paystack";
import { getOrCreatePaystackCustomer } from "@/lib/billing";
import { createCheckoutSchema } from "@/lib/validations/billing";
import { getOrganizationMemberRole } from "@/lib/organization";
import { hasPermission, Permission, type OrgRoleType } from "@/lib/permissions";

interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json(
        { error: "Paystack is not configured. Add PAYSTACK_SECRET_KEY to .env.local" },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = createCheckoutSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { organizationId, planSlug, billingInterval, successUrl, cancelUrl } =
      result.data;

    // Check permissions
    const role = await getOrganizationMemberRole(organizationId, session.user.id);
    if (!role || !hasPermission(role as OrgRoleType, Permission.ORG_MANAGE_BILLING)) {
      return NextResponse.json(
        { error: "You don't have permission to manage billing" },
        { status: 403 }
      );
    }

    // Get organization and user details
    const [org, user] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId },
        include: { plan: true },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true },
      }),
    ]);

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get the plan
    const plan = await prisma.plan.findUnique({
      where: { slug: planSlug },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Get or create Paystack customer
    const customerEmail = user?.email || session.user.email || "";
    await getOrCreatePaystackCustomer(organizationId, customerEmail, org.name);

    // Determine Paystack plan code
    const planCode =
      billingInterval === "yearly"
        ? plan.paystackPlanCodeYearly
        : plan.paystackPlanCodeMonthly;

    if (!planCode) {
      return NextResponse.json(
        { error: "Plan code not configured for this plan" },
        { status: 400 }
      );
    }

    // Determine amount (Paystack uses the smallest currency unit, e.g. kobo for NGN)
    const amount =
      billingInterval === "yearly" ? plan.priceYearly : plan.priceMonthly;

    const callbackUrl =
      successUrl ||
      `${process.env.NEXTAUTH_URL}/${org.slug}/settings/billing?success=true`;

    // Initialize Paystack transaction with plan for subscription
    const paystackRes = await paystackPost<PaystackInitResponse>(
      "/transaction/initialize",
      {
        email: customerEmail,
        amount,
        plan: planCode,
        callback_url: callbackUrl,
        metadata: {
          organizationId,
          planSlug,
          billingInterval,
          cancel_action: cancelUrl || `${process.env.NEXTAUTH_URL}/${org.slug}/settings/billing?canceled=true`,
        },
      }
    );

    return NextResponse.json({
      url: paystackRes.data.authorization_url,
      reference: paystackRes.data.reference,
      type: "checkout",
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
