"use client";

import { useState } from "react";
import { CreditCard, Calendar, AlertCircle, ExternalLink } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { SerializedBillingInfo } from "@/types/billing";
import { formatPrice } from "@/lib/billing/plans";

interface CurrentPlanCardProps {
  billing: SerializedBillingInfo;
  orgId: string;
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  trialing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  past_due: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  canceled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  incomplete: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

export function CurrentPlanCard({ billing, orgId }: CurrentPlanCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleManageBilling = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });

      if (!response.ok) {
        throw new Error("Failed to open billing portal");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch {
      toast.error("Failed to open billing portal");
    } finally {
      setIsLoading(false);
    }
  };

  const plan = billing.plan;
  const subscription = billing.subscription;
  const trial = billing.trial;

  const currentPeriodEnd = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const price = plan
    ? subscription.interval === "yearly"
      ? formatPrice(plan.priceYearly / 12)
      : formatPrice(plan.priceMonthly)
    : "$0";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>{plan?.name || "Free"} Plan</CardTitle>
              <CardDescription>
                {price}/month
                {subscription.interval === "yearly" && (
                  <span className="text-xs ml-1">(billed yearly)</span>
                )}
              </CardDescription>
            </div>
          </div>
          {subscription.status && (
            <Badge className={statusColors[subscription.status] || statusColors.incomplete}>
              {subscription.status === "trialing" ? "Trial" : subscription.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {trial.isActive && trial.daysRemaining > 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-blue-800 dark:text-blue-200">
              Your trial ends in {trial.daysRemaining} day{trial.daysRemaining !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {subscription.cancelAtPeriodEnd && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-yellow-800 dark:text-yellow-200">
              Your subscription will cancel at the end of the billing period
            </span>
          </div>
        )}

        {currentPeriodEnd && !subscription.cancelAtPeriodEnd && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Next billing date: {currentPeriodEnd}</span>
          </div>
        )}

        {plan?.description && (
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleManageBilling}
            disabled={isLoading}
            variant="outline"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            {isLoading ? "Loading..." : "Manage Billing"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
