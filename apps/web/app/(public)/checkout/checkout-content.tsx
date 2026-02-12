"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@repo/ui";
import { Check, X, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  limits: {
    messages: number;
    workspaces: number;
    chatbots: number;
  };
  features: {
    analytics: boolean;
    customBranding: boolean;
    sso?: boolean;
  };
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

function formatLimit(value: number): string {
  if (value === -1) return "Unlimited";
  return value.toLocaleString();
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

export function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(
    searchParams.get("plan")
  );
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">(
    (searchParams.get("billing") as "monthly" | "yearly") || "yearly"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Fetch plans
  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch("/api/plans");
        if (res.ok) {
          const data = await res.json();
          setPlans(data.plans || []);
        }
      } catch (error) {
        console.error("Failed to fetch plans:", error);
      }
    }
    fetchPlans();
  }, []);

  // Fetch user organizations
  useEffect(() => {
    async function fetchOrgs() {
      if (status !== "authenticated") return;

      try {
        const res = await fetch("/api/organizations");
        if (res.ok) {
          const data = await res.json();
          // API returns flat array directly
          const orgs = Array.isArray(data) ? data : (data.organizations || []);
          setOrganizations(orgs);
          if (orgs.length === 1) {
            setSelectedOrg(orgs[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to fetch organizations:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrgs();
  }, [status]);

  // Set loading false if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      setIsLoading(false);
    }
  }, [status]);

  const handleCheckout = async () => {
    if (!selectedPlan) {
      toast.error("Please select a plan");
      return;
    }

    // If not logged in, redirect to signup with plan info
    if (status === "unauthenticated") {
      const params = new URLSearchParams({
        plan: selectedPlan,
        billing: billingInterval,
        redirect: "/checkout",
      });
      router.push(`/signup?${params.toString()}`);
      return;
    }

    // If no organization, redirect to onboarding
    if (!selectedOrg && organizations.length === 0) {
      const params = new URLSearchParams({
        plan: selectedPlan,
        billing: billingInterval,
      });
      router.push(`/onboarding?${params.toString()}`);
      return;
    }

    if (!selectedOrg) {
      toast.error("Please select an organization");
      return;
    }

    // Free plan - just redirect to dashboard
    const plan = plans.find((p) => p.slug === selectedPlan);
    if (plan && plan.priceMonthly === 0) {
      toast.success("You're on the Free plan!");
      const org = organizations.find((o) => o.id === selectedOrg);
      router.push(`/${org?.slug || ""}`);
      return;
    }

    setIsCheckingOut(true);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selectedOrg,
          planSlug: selectedPlan,
          billingInterval,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create checkout session");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to initiate checkout");
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (isLoading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-4">
            <Sparkles className="h-4 w-4" />
            Choose Your Plan
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Start building amazing chatbots
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Select a plan to continue. You can upgrade or downgrade anytime.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <span
              className={cn(
                "text-sm font-medium",
                billingInterval === "monthly"
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Monthly
            </span>
            <button
              onClick={() =>
                setBillingInterval(
                  billingInterval === "monthly" ? "yearly" : "monthly"
                )
              }
              className={cn(
                "relative h-7 w-14 rounded-full p-1 transition-colors",
                billingInterval === "yearly" ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                  billingInterval === "yearly" && "translate-x-7"
                )}
              />
            </button>
            <span
              className={cn(
                "text-sm font-medium",
                billingInterval === "yearly"
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Yearly{" "}
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Save 17%
              </span>
            </span>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.slug;
            const isPopular = plan.slug === "pro";
            const price =
              billingInterval === "yearly"
                ? plan.priceYearly
                : plan.priceMonthly;

            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative cursor-pointer transition-all hover:shadow-lg",
                  isSelected && "ring-2 ring-primary shadow-lg",
                  isPopular && "border-primary"
                )}
                onClick={() => setSelectedPlan(plan.slug)}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {plan.name}
                    {isSelected && (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">
                      {formatPrice(price)}
                    </span>
                    <span className="text-muted-foreground">
                      /{billingInterval === "yearly" ? "year" : "month"}
                    </span>
                    {billingInterval === "yearly" && plan.priceMonthly > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatPrice(Math.round(plan.priceYearly / 12))}/month
                        billed annually
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      {formatLimit(plan.limits.chatbots)} chatbots
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      {formatLimit(plan.limits.messages)} messages/month
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      {formatLimit(plan.limits.workspaces)} workspaces
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      {plan.features.analytics ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span
                        className={
                          !plan.features.analytics
                            ? "text-muted-foreground"
                            : ""
                        }
                      >
                        Analytics
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      {plan.features.customBranding ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span
                        className={
                          !plan.features.customBranding
                            ? "text-muted-foreground"
                            : ""
                        }
                      >
                        Custom Branding
                      </span>
                    </li>
                    {plan.features.sso !== undefined && (
                      <li className="flex items-center gap-2 text-sm">
                        {plan.features.sso ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span
                          className={
                            !plan.features.sso ? "text-muted-foreground" : ""
                          }
                        >
                          SSO/SAML
                        </span>
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Organization Selection (if logged in with multiple orgs) */}
        {status === "authenticated" && organizations.length > 1 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Select Organization</CardTitle>
              <CardDescription>
                Choose which organization to upgrade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => setSelectedOrg(org.id)}
                    className={cn(
                      "p-4 rounded-lg border text-left transition-all",
                      selectedOrg === org.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <p className="font-medium">{org.name}</p>
                    <p className="text-sm text-muted-foreground">{org.slug}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Checkout Button */}
        <div className="flex flex-col items-center gap-4">
          <Button
            size="lg"
            className="w-full max-w-md"
            onClick={handleCheckout}
            disabled={!selectedPlan || isCheckingOut}
          >
            {isCheckingOut ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            {status === "unauthenticated"
              ? "Continue to Sign Up"
              : selectedPlan &&
                plans.find((p) => p.slug === selectedPlan)?.priceMonthly === 0
              ? "Get Started Free"
              : "Continue to Payment"}
          </Button>

          {status === "authenticated" && (
            <p className="text-sm text-muted-foreground">
              Secure checkout powered by Paystack
            </p>
          )}

          {status === "unauthenticated" && (
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
