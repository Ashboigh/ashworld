"use client";

import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { PLAN_LIMITS, PLAN_FEATURES, formatLimit, formatPrice } from "@/lib/billing/plans";
import type { PlanSlug } from "@/lib/billing/plans";

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
}

interface PlanComparisonTableProps {
  plans: Plan[];
  currentPlanSlug: string | null;
  orgId: string;
  isTrialing?: boolean;
}

const featureLabels: Record<string, string> = {
  customBranding: "Custom Branding",
  apiAccess: "API Access",
  prioritySupport: "Priority Support",
  sso: "SSO / SAML",
  whitelabel: "White Label",
};

export function PlanComparisonTable({
  plans,
  currentPlanSlug,
  orgId,
  isTrialing,
}: PlanComparisonTableProps) {
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const handleUpgrade = async (planId: string, planSlug: string) => {
    if (planSlug === currentPlanSlug && !isTrialing) {
      return;
    }

    setLoadingPlanId(planId);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId,
          planSlug,
          interval: isYearly ? "yearly" : "monthly",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create checkout session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start checkout");
    } finally {
      setLoadingPlanId(null);
    }
  };

  const sortedPlans = [...plans].sort((a, b) => {
    const order = ["free", "starter", "professional", "enterprise"];
    return order.indexOf(a.slug) - order.indexOf(b.slug);
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Plans & Pricing</CardTitle>
            <CardDescription>
              Choose the plan that best fits your needs
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${!isYearly ? "font-medium" : "text-muted-foreground"}`}>
              Monthly
            </span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span className={`text-sm ${isYearly ? "font-medium" : "text-muted-foreground"}`}>
              Yearly
            </span>
            {isYearly && (
              <Badge variant="secondary" className="ml-2">
                Save 2 months
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sortedPlans.map((plan) => {
            const isCurrentPlan = plan.slug === currentPlanSlug && !isTrialing;
            const limits = PLAN_LIMITS[plan.slug as PlanSlug] || PLAN_LIMITS.free;
            const features = PLAN_FEATURES[plan.slug as PlanSlug] || PLAN_FEATURES.free;
            const price = isYearly
              ? formatPrice(plan.priceYearly / 12)
              : formatPrice(plan.priceMonthly);
            const isPopular = plan.slug === "professional";
            const isFree = plan.slug === "free";

            return (
              <div
                key={plan.id}
                className={`relative rounded-lg border p-4 ${
                  isPopular ? "border-primary ring-2 ring-primary" : "border-border"
                } ${isCurrentPlan ? "bg-muted/50" : ""}`}
              >
                {isPopular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                {isCurrentPlan && (
                  <Badge variant="outline" className="absolute -top-2 right-2">
                    Current Plan
                  </Badge>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {plan.description}
                    </p>
                  </div>

                  <div>
                    <span className="text-3xl font-bold">{price}</span>
                    <span className="text-muted-foreground">/month</span>
                    {isYearly && !isFree && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Billed {formatPrice(plan.priceYearly)}/year
                      </p>
                    )}
                  </div>

                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? "outline" : isPopular ? "default" : "secondary"}
                    disabled={isCurrentPlan || loadingPlanId !== null || isFree}
                    onClick={() => handleUpgrade(plan.id, plan.slug)}
                  >
                    {loadingPlanId === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrentPlan ? (
                      "Current Plan"
                    ) : isFree ? (
                      "Free Plan"
                    ) : (
                      "Upgrade"
                    )}
                  </Button>

                  <div className="space-y-2 pt-4 border-t">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Limits
                    </p>
                    <ul className="space-y-1 text-sm">
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Messages</span>
                        <span className="font-medium">{formatLimit(limits.messages)}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Workspaces</span>
                        <span className="font-medium">{formatLimit(limits.workspaces)}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Chatbots</span>
                        <span className="font-medium">{formatLimit(limits.chatbots)}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Members</span>
                        <span className="font-medium">{formatLimit(limits.members)}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Knowledge Bases</span>
                        <span className="font-medium">{formatLimit(limits.knowledgeBases)}</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Features
                    </p>
                    <ul className="space-y-1 text-sm">
                      {Object.entries(featureLabels).map(([key, label]) => {
                        const hasFeature = features[key as keyof typeof features];
                        return (
                          <li key={key} className="flex items-center gap-2">
                            {hasFeature ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <X className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className={hasFeature ? "" : "text-muted-foreground"}>
                              {label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
