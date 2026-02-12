"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button } from "@repo/ui";

interface PromptTemplateSummary {
  id: string;
  name: string;
  description: string | null;
  category: string;
  variables: string[];
  versions: Array<{
    id: string;
    version: number;
    modelName: string;
    modelProvider: string;
  }>;
}

interface ModelComparisonEntry {
  provider: string;
  model: string;
  latencyMs: number;
  costPerTokenUsd: number;
  qualityScore: number;
}

interface AnalyticsQualityFlag {
  id: string;
  reason: string;
  severity: string;
  createdAt: string;
  message: {
    content: string;
    role: string;
  };
}

interface CostSummary {
  totalTokens: number;
  totalCost: number;
  prompts: number;
  completions: number;
  providers: Record<string, number>;
}

interface ABTestSummary {
  id: string;
  status: string;
  variantKey: string;
  trafficSplit: number;
  promptVersion: {
    version: number;
    modelName: string;
  };
}

interface AIOptimizationDashboardProps {
  organizationId: string;
  workspaceId: string;
}

export function AIOptimizationDashboard({
  organizationId,
  workspaceId,
}: AIOptimizationDashboardProps) {
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplateSummary[]>([]);
  const [models, setModels] = useState<ModelComparisonEntry[]>([]);
  const [flags, setFlags] = useState<AnalyticsQualityFlag[]>([]);
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [abTests, setAbTests] = useState<ABTestSummary[]>([]);

  useEffect(() => {
    async function loadPrompts() {
      try {
        const response = await fetch(`/api/ai-optimization/prompts?workspaceId=${workspaceId}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Unable to load prompts");
        }
        const data = await response.json();
        setPromptTemplates(data.templates ?? []);
      } catch (error) {
        console.error("Prompt fetch error:", error);
        toast.error(error instanceof Error ? error.message : "Failed to load prompts");
      }
    }

    async function loadModels() {
      try {
        const response = await fetch("/api/ai-optimization/model-comparison", {
          cache: "no-store",
        });
        const data = await response.json();
        setModels(data.models ?? []);
      } catch (error) {
        console.error("Model fetch error:", error);
        toast.error("Failed to load model comparison");
      }
    }

    async function loadFlags() {
      try {
        const response = await fetch(`/api/ai-optimization/quality?organizationId=${organizationId}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json();
        setFlags(data.flags ?? []);
      } catch (error) {
        console.error("Quality fetch error:", error);
      }
    }

    async function loadCost() {
      try {
        const response = await fetch(`/api/ai-optimization/cost?organizationId=${organizationId}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json();
        setCostSummary(data.costSummary ?? null);
      } catch (error) {
        console.error("Cost fetch error:", error);
      }
    }

    async function loadABTests() {
      try {
        const response = await fetch(`/api/ai-optimization/ab?workspaceId=${workspaceId}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json();
        setAbTests(data.tests ?? []);
      } catch (error) {
        console.error("AB tests fetch error:", error);
      }
    }

    loadPrompts();
    loadModels();
    loadFlags();
    loadCost();
    loadABTests();
  }, [organizationId, workspaceId]);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Prompt templates</CardTitle>
            <CardDescription>
              Manage system prompts, version them, and route workflows for testing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {promptTemplates.slice(0, 3).map((template) => (
              <div key={template.id} className="rounded-md border px-3 py-2">
                <p className="font-semibold">{template.name}</p>
                <p className="text-xs text-muted-foreground">{template.description}</p>
                <p className="text-xs text-muted-foreground">
                  Versions: {template.versions.map((v) => v.version).join(", ")}
                </p>
              </div>
            ))}
            <Button variant="outline" size="sm">
              View all prompts
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Model comparison</CardTitle>
            <CardDescription>Cost, latency, and quality tradeoffs per provider.</CardDescription>
          </CardHeader>
          <CardContent>
            {models.map((model) => (
              <p key={`${model.provider}-${model.model}`} className="text-sm">
                {model.provider} · {model.model} — ${model.costPerTokenUsd.toFixed(5)}/token · {model.latencyMs} ms · quality {model.qualityScore}/100
              </p>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cost tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Total tokens: {costSummary?.totalTokens ?? "—"}</p>
            <p>Total cost: ${costSummary?.totalCost.toFixed(2) ?? "—"}</p>
            <p>Prompt tokens: {costSummary?.prompts ?? "—"}</p>
            <p>Completion tokens: {costSummary?.completions ?? "—"}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>A/B tests</CardTitle>
            <CardDescription>Traffic split per prompt version.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {abTests.length ? (
              abTests.map((test) => (
                <div key={test.id} className="rounded-md border px-3 py-2">
                  <p className="font-semibold">{test.variantKey}</p>
                  <p className="text-xs text-muted-foreground">
                    {test.status} · {Math.round(test.trafficSplit * 100)}% traffic
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Prompt v{test.promptVersion.version} · {test.promptVersion.modelName}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No AB tests configured</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quality review queue</CardTitle>
            <CardDescription>Flagged responses waiting for human review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {flags.length ? (
              flags.slice(0, 3).map((flag) => (
                <div key={flag.id} className="rounded-md border px-3 py-2">
                  <p className="font-semibold">{flag.reason}</p>
                  <p className="text-xs text-muted-foreground">{flag.severity}</p>
                  <p className="text-xs text-muted-foreground">{flag.message.content}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No quality issues reported</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
