import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { getOrganizationBySlug } from "@/lib/organization";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  CurrentPlanCard,
  UsageMeters,
  PlanComparisonTable,
  BillingHistoryTable,
} from "@/components/billing";
import type { SerializedBillingInfo, SerializedBillingHistoryItem } from "@/types/billing";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export const metadata = {
  title: "Billing & Plans",
};

async function getBillingData(organizationId: string): Promise<{
  billing: SerializedBillingInfo;
  history: SerializedBillingHistoryItem[];
  plans: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    priceMonthly: number;
    priceYearly: number;
  }>;
}> {
  const [org, plans, history] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        plan: true,
        _count: {
          select: {
            members: true,
            workspaces: true,
          },
        },
      },
    }),
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.billingHistory.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  if (!org) {
    throw new Error("Organization not found");
  }

  // Get counts for chatbots and knowledge bases across all workspaces
  const workspaceIds = await prisma.workspace.findMany({
    where: { organizationId },
    select: { id: true },
  });

  const [chatbotCount, knowledgeBaseCount] = await Promise.all([
    prisma.chatbot.count({
      where: { workspaceId: { in: workspaceIds.map((w) => w.id) } },
    }),
    prisma.knowledgeBase.count({
      where: { workspaceId: { in: workspaceIds.map((w) => w.id) } },
    }),
  ]);

  const limits = (org.plan?.limits as Record<string, number>) || {
    messages: 100,
    workspaces: 1,
    chatbots: 1,
    members: 1,
    knowledgeBases: 1,
  };

  const calculatePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0;
    return Math.round((used / limit) * 100);
  };

  const billing: SerializedBillingInfo = {
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
    usage: {
      messages: {
        used: org.messagesUsedThisMonth,
        limit: limits.messages ?? 100,
        percentage: calculatePercentage(org.messagesUsedThisMonth, limits.messages ?? 100),
      },
      workspaces: {
        used: org._count.workspaces,
        limit: limits.workspaces ?? 1,
        percentage: calculatePercentage(org._count.workspaces, limits.workspaces ?? 1),
      },
      chatbots: {
        used: chatbotCount,
        limit: limits.chatbots ?? 1,
        percentage: calculatePercentage(chatbotCount, limits.chatbots ?? 1),
      },
      members: {
        used: org._count.members,
        limit: limits.members ?? 1,
        percentage: calculatePercentage(org._count.members, limits.members ?? 1),
      },
      knowledgeBases: {
        used: knowledgeBaseCount,
        limit: limits.knowledgeBases ?? 1,
        percentage: calculatePercentage(knowledgeBaseCount, limits.knowledgeBases ?? 1),
      },
    },
    trial: {
      isActive: org.subscriptionStatus === "trialing",
      endsAt: org.trialEndsAt?.toISOString() || null,
      daysRemaining: org.trialEndsAt
        ? Math.max(0, Math.ceil((org.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0,
    },
  };

  const formattedHistory: SerializedBillingHistoryItem[] = history.map((h) => ({
    id: h.id,
    amount: h.amount,
    currency: h.currency,
    status: h.status,
    description: h.description,
    invoiceUrl: h.invoiceUrl,
    invoicePdf: h.invoicePdf,
    periodStart: h.periodStart.toISOString(),
    periodEnd: h.periodEnd.toISOString(),
    createdAt: h.createdAt.toISOString(),
  }));

  const formattedPlans = plans.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    priceMonthly: p.priceMonthly,
    priceYearly: p.priceYearly,
  }));

  return { billing, history: formattedHistory, plans: formattedPlans };
}

export default async function BillingSettingsPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const { organization, membership } = await getOrganizationBySlug(orgSlug, session.user.id);

  if (!organization || !membership) {
    notFound();
  }

  const canManageBilling = hasPermission(membership.role, Permission.ORG_MANAGE_BILLING);

  if (!canManageBilling) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing & Plans</h1>
          <p className="text-muted-foreground">
            Manage your subscription and billing settings
          </p>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            You don&apos;t have permission to manage billing settings.
          </p>
        </div>
      </div>
    );
  }

  const { billing, history, plans } = await getBillingData(organization.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing & Plans</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing settings
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CurrentPlanCard billing={billing} orgId={organization.id} />
        <UsageMeters usage={billing.usage} />
      </div>

      <PlanComparisonTable
        plans={plans}
        currentPlanSlug={billing.plan?.slug || null}
        orgId={organization.id}
        isTrialing={billing.trial.isActive}
      />

      <BillingHistoryTable history={history} />
    </div>
  );
}
