import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import {
  cancelPaystackSubscription,
  reactivatePaystackSubscription,
  getPaystackSubscription,
} from "@/lib/billing";
import { getOrganizationMemberRole } from "@/lib/organization";
import { hasPermission, Permission, type OrgRoleType } from "@/lib/permissions";

/**
 * POST /api/billing/portal
 * Manage subscription: cancel or reactivate
 *
 * Body: { organizationId, action: "cancel" | "reactivate" }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId } = body;
    const action = body.action as string;

    if (!organizationId || !action) {
      return NextResponse.json(
        { error: "organizationId and action are required" },
        { status: 400 }
      );
    }

    // Check permissions
    const role = await getOrganizationMemberRole(organizationId, session.user.id);
    if (!role || !hasPermission(role as OrgRoleType, Permission.ORG_MANAGE_BILLING)) {
      return NextResponse.json(
        { error: "You don't have permission to manage billing" },
        { status: 403 }
      );
    }

    // Get organization
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { paystackSubscriptionCode: true, slug: true },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    if (!org.paystackSubscriptionCode) {
      return NextResponse.json(
        { error: "No active subscription found. Please subscribe to a plan first." },
        { status: 400 }
      );
    }

    // Get subscription to retrieve email token
    const subscription = await getPaystackSubscription(org.paystackSubscriptionCode);
    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found on Paystack" },
        { status: 404 }
      );
    }

    if (action === "cancel") {
      await cancelPaystackSubscription(
        org.paystackSubscriptionCode,
        subscription.email_token
      );
      await prisma.organization.update({
        where: { id: organizationId },
        data: { cancelAtPeriodEnd: true },
      });
      return NextResponse.json({ success: true, message: "Subscription will be cancelled at end of period" });
    }

    if (action === "reactivate") {
      await reactivatePaystackSubscription(
        org.paystackSubscriptionCode,
        subscription.email_token
      );
      await prisma.organization.update({
        where: { id: organizationId },
        data: { cancelAtPeriodEnd: false },
      });
      return NextResponse.json({ success: true, message: "Subscription reactivated" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Subscription management error:", error);
    return NextResponse.json(
      { error: "Failed to manage subscription" },
      { status: 500 }
    );
  }
}
