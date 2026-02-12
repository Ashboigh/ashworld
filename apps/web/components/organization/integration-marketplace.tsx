"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Puzzle } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardDescription, CardTitle } from "@repo/ui";
import type { IntegrationProvider } from "@/lib/integrations/types";

interface IntegrationMarketplaceProps {
  providers: IntegrationProvider[];
  organizationId: string;
}

export function IntegrationMarketplace({
  providers,
  organizationId,
}: IntegrationMarketplaceProps) {
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider | null>(null);

  const categories = useMemo(() => {
    const grouped: Record<string, IntegrationProvider[]> = {};
    for (const provider of providers) {
      if (!grouped[provider.category]) {
        grouped[provider.category] = [];
      }
      grouped[provider.category]!.push(provider);
    }
    return grouped;
  }, [providers]);

  const handleConfigureClick = (provider: IntegrationProvider) => {
    setSelectedProvider(provider);
    toast(`Preparing configuration for ${provider.name}`);
  };

  const handleStartOAuth = (provider: IntegrationProvider) => {
    if (!provider.oauth) {
      toast.error("This provider does not have an OAuth flow defined yet.");
      return;
    }
    toast.success(`Starting OAuth for ${provider.name} (placeholder).`);
    window.open(provider.oauth.authorizeUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      {Object.entries(categories).map(([category, items]) => (
        <section key={category} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold capitalize">{category}</h2>
            <p className="text-sm text-muted-foreground">
              {items.length} provider{items.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((provider) => (
              <Card key={provider.id} className="border-border bg-background/60">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background">
                      {provider.logoUrl ? (
                        <Image
                          src={provider.logoUrl}
                          alt={`${provider.name} logo`}
                          width={24}
                          height={24}
                          className="h-6 w-6"
                          unoptimized
                        />
                      ) : (
                        <Puzzle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-base">{provider.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {provider.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {provider.category}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {provider.actions.slice(0, 2).map((action) => (
                      <span key={action.id} className="rounded-full border px-2 py-1">
                        {action.title}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Button size="sm" type="button" onClick={() => handleConfigureClick(provider)}>
                      Configure
                    </Button>
                    {provider.oauth ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        type="button"
                        onClick={() => handleStartOAuth(provider)}
                      >
                        Start OAuth
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Manual setup
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
      {selectedProvider && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-background">
                {selectedProvider.logoUrl ? (
                  <Image
                    src={selectedProvider.logoUrl}
                    alt={`${selectedProvider.name} logo`}
                    width={32}
                    height={32}
                    className="h-8 w-8"
                    unoptimized
                  />
                ) : (
                  <Puzzle className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1">
                <CardTitle className="text-base">{selectedProvider.name} configuration</CardTitle>
                <CardDescription className="text-sm">
                  Select an action to populate workflow nodes or register a webhook.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-semibold">Actions</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {selectedProvider.actions.map((action) => (
                  <li key={action.id}>
                    <strong>{action.title}</strong>
                    <p>{action.description}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold">OAuth</p>
              <p className="text-xs text-muted-foreground">
                {selectedProvider.oauth
                  ? `Authorize via ${selectedProvider.oauth.authorizeUrl}`
                  : "No OAuth flow defined yet."}
              </p>
              <p className="text-sm font-semibold">Webhooks</p>
              <p className="text-xs text-muted-foreground">
                {selectedProvider.webhookEvents?.join(", ") ?? "No webhook events defined"}
              </p>
            </div>
          </CardContent>
          <div className="px-6 pb-4 text-xs text-muted-foreground">
            Organization ID: {organizationId}
          </div>
        </Card>
      )}
    </div>
  );
}
