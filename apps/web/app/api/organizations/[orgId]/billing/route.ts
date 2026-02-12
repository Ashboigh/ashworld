import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { getOrganizationMemberRole } from "@/lib/organization";
import { hasPermission, Permission, type OrgRoleType } from "@/lib/permissions";
import { getOrganizationBillingStatus } from "@/lib/billing";
import type { SerializedBillingInfo, SerializedBillingHistoryItem } from "@/types/billing";

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await params;

    // Check permissions
    const role = await getOrganizationMemberRole(orgId, session.user.id);
    if (!role || !hasPermission(role as OrgRoleType, Permission.ORG_MANAGE_BILLING)) {
      return NextResponse.json(
        { error: "You don't have permission to view billing" },
        { status: 403 }
      );
    }

    // Get organization with plan
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        plan: true,
        billingHistory: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get billing status (limits and usage)
    const billingStatus = await getOrganizationBillingStatus(orgId);

    // Calculate trial info
    const now = new Date();
    const trialEndsAt = org.trialEndsAt;
    const isTrialing = org.subscriptionStatus === "trialing" ||
      (trialEndsAt !== null && trialEndsAt > now && !org.paystackSubscriptionCode);
    const daysRemaining = trialEndsAt
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    // Build usage data with percentages
    const usage = {
      messages: {
        used: billingStatus.usage.messages,
        limit: billingStatus.limits.messages,
        percentage: billingStatus.percentages.messages,
      },
      workspaces: {
        used: billingStatus.usage.workspaces,
        limit: billingStatus.limits.workspaces,
        percentage: billingStatus.percentages.workspaces,
      },
      chatbots: {
        used: billingStatus.usage.chatbots,
        limit: billingStatus.limits.chatbots,
        percentage: billingStatus.percentages.chatbots,
      },
      members: {
        used: billingStatus.usage.members,
        limit: billingStatus.limits.members,
        percentage: billingStatus.percentages.members,
      },
      knowledgeBases: {
        used: billingStatus.usage.knowledgeBases,
        limit: billingStatus.limits.knowledgeBases,
        percentage: billingStatus.percentages.knowledgeBases,
      },
    };

    const billingInfo: SerializedBillingInfo = {
      plan: org.plan
        ? {
            id: org.plan.id,
            name: org.plan.name,
            slug: org.plan.slug,
            description: org.plan.description,
            priceMonthly: org.plan.priceMonthly,
            priceYearly: org.plan.priceYearly,
            limits: org.plan.limits as unknown as NonNullable<SerializedBillingInfo["plan"]>["limits"],
            features: org.plan.features as unknown as NonNullable<SerializedBillingInfo["plan"]>["features"],
          }
        : null,
      subscription: {
        status: org.subscriptionStatus as SerializedBillingInfo["subscription"]["status"],
        interval: org.billingInterval as SerializedBillingInfo["subscription"]["interval"],
        currentPeriodEnd: org.currentPeriodEnd?.toISOString() || null,
        cancelAtPeriodEnd: org.cancelAtPeriodEnd,
      },
      trial: {
        isActive: isTrialing,
        endsAt: trialEndsAt?.toISOString() || null,
        daysRemaining,
      },
      usage,
    };

    // Serialize billing history
    const billingHistory: SerializedBillingHistoryItem[] = org.billingHistory.map(
      (item) => ({
        id: item.id,
        amount: item.amount,
        currency: item.currency,
        status: item.status,
        description: item.description,
        invoiceUrl: item.invoiceUrl,
        invoicePdf: item.invoicePdf,
        periodStart: item.periodStart.toISOString(),
        periodEnd: item.periodEnd.toISOString(),
        createdAt: item.createdAt.toISOString(),
      })
    );

    return NextResponse.json({
      billing: billingInfo,
      history: billingHistory,
    });
  } catch (error) {
    console.error("Get billing error:", error);
    return NextResponse.json(
      { error: "Failed to get billing information" },
      { status: 500 }
    );
  }
}
