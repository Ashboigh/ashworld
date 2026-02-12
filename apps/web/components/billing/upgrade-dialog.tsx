"use client";

import { useState } from "react";
import { Loader2, Check, Zap } from "lucide-react";
import { Button } from "@repo/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { formatPrice, formatLimit, PLAN_LIMITS, type PlanSlug } from "@/lib/billing/plans";

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
}

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan;
  orgId: string;
  currentPlanSlug?: string;
}

export function UpgradeDialog({
  open,
  onOpenChange,
  plan,
  orgId,
  currentPlanSlug,
}: UpgradeDialogProps) {
  const [isYearly, setIsYearly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const limits = PLAN_LIMITS[plan.slug as PlanSlug] || PLAN_LIMITS.free;
  const price = isYearly ? plan.priceYearly / 12 : plan.priceMonthly;
  const yearlyTotal = plan.priceYearly;
  const monthlySavings = isYearly ? (plan.priceMonthly * 12 - plan.priceYearly) : 0;

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId,
          planSlug: plan.slug,
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
      setIsLoading(false);
    }
  };

  const isCurrentPlan = plan.slug === currentPlanSlug;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Upgrade to {plan.name}
          </DialogTitle>
          <DialogDescription>{plan.description}</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm ${!isYearly ? "font-medium" : "text-muted-foreground"}`}>
              Monthly
            </span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span className={`text-sm ${isYearly ? "font-medium" : "text-muted-foreground"}`}>
              Yearly
            </span>
          </div>

          <div className="text-center py-4 border rounded-lg">
            <span className="text-4xl font-bold">{formatPrice(price)}</span>
            <span className="text-muted-foreground">/month</span>
            {isYearly && (
              <>
                <p className="text-sm text-muted-foreground mt-1">
                  Billed {formatPrice(yearlyTotal)}/year
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Save {formatPrice(monthlySavings)}/year
                </p>
              </>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Includes:</p>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                {formatLimit(limits.messages)} messages/month
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                {formatLimit(limits.workspaces)} workspaces
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                {formatLimit(limits.chatbots)} chatbots
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                {formatLimit(limits.members)} team members
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                {formatLimit(limits.knowledgeBases)} knowledge bases
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpgrade} disabled={isLoading || isCurrentPlan}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : isCurrentPlan ? (
              "Current Plan"
            ) : (
              "Upgrade Now"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
