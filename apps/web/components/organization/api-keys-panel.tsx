"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@repo/ui";
import { ApiKeyScopes } from "@/lib/api-keys/scopes";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  scopes: z.string().min(1, "Provide at least one scope"),
  expiresAt: z.string().optional(),
  ipWhitelist: z.string().optional(),
});

type CreateApiKeyForm = z.infer<typeof createSchema>;

export interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  ipWhitelist: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
  createdBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
}

interface ApiKeysPanelProps {
  organizationId: string;
  canManage: boolean;
  initialKeys: ApiKeyRow[];
}

export function ApiKeysPanel({
  organizationId,
  canManage,
  initialKeys,
}: ApiKeysPanelProps) {
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>(initialKeys);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [createdKeyName, setCreatedKeyName] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const form = useForm<CreateApiKeyForm>({
    resolver: zodResolver(createSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      scopes: `${ApiKeyScopes.CHATBOT_READ} ${ApiKeyScopes.CHATBOT_CHAT}`,
      expiresAt: "",
      ipWhitelist: "",
    },
  });

  const { register, handleSubmit, reset, formState } = form;

  const scopeOptions = useMemo(
    () =>
      Object.entries(ApiKeyScopes).map(([key, value]) => ({
        key,
        label: value,
      })),
    []
  );

  const handleCreate = async (values: CreateApiKeyForm) => {
    if (!canManage) return;
    setIsCreating(true);
    try {
      const payload = {
        name: values.name,
        scopes: values.scopes
          .split(/[\s,]+/)
          .map((value) => value.trim())
          .filter(Boolean),
        expiresAt: values.expiresAt || null,
        ipWhitelist: values.ipWhitelist
          ? values.ipWhitelist
              .split(/[\s,]+/)
              .map((value) => value.trim())
              .filter(Boolean)
          : [],
      };

      const response = await fetch(
        `/api/organizations/${organizationId}/api-keys`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to create API key");
        return;
      }

      setApiKeys((prev) => [data.apiKey, ...prev]);
      setCreatedKey(data.key);
      setCreatedKeyName(data.apiKey.name);
      toast.success("API key created");
      reset({
        name: "",
        scopes: `${ApiKeyScopes.CHATBOT_READ} ${ApiKeyScopes.CHATBOT_CHAT}`,
        expiresAt: "",
        ipWhitelist: "",
      });
    } catch (error) {
      console.error("Create API key error", error);
      toast.error("Failed to create API key");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (!canManage) return;
    setRevokingId(keyId);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/api-keys/${keyId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to revoke API key");
        return;
      }

      setApiKeys((prev) => prev.filter((apiKey) => apiKey.id !== keyId));
      toast.success("API key revoked");
    } catch (error) {
      console.error("Revoke API key error", error);
      toast.error("Failed to revoke API key");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate API Key</CardTitle>
          <CardDescription>
            Create scoped keys with expiration and optional IP restrictions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {createdKey && createdKeyName && (
            <div className="rounded-md border border-primary bg-primary/10 p-3 text-sm">
              <p className="font-medium">Save this key; it will not appear again.</p>
              <p className="text-xs text-muted-foreground">
                {createdKeyName}
              </p>
              <p className="mt-2 break-all font-mono text-sm">{createdKey}</p>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-semibold">Key name</label>
              <Input {...register("name")} placeholder="My automation key" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold">Scopes</label>
              <Input
                {...register("scopes")}
                placeholder="chatbot:read chatbot:chat"
              />
              <p className="text-xs text-muted-foreground">
                Space or comma separated. Available:
                {scopeOptions.map((option) => (
                  <span key={option.key} className="ml-1 font-mono">
                    {option.label}
                  </span>
                ))}
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-semibold">Expires at</label>
              <Input
                type="datetime-local"
                {...register("expiresAt")}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold">IP whitelist</label>
              <Input
                {...register("ipWhitelist")}
                placeholder="203.0.113.0/24, 198.51.100.5"
              />
              <p className="text-xs text-muted-foreground">
                Optional comma or space separated IPs/CIDRs.
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit(handleCreate)}
              disabled={!canManage || isCreating || !formState.isValid}
            >
              {isCreating ? "Creating…" : "Create API key"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="space-y-4">
        <CardHeader>
          <CardTitle>Active API keys</CardTitle>
          <CardDescription>
            Keys are hashed after creation; only their prefixes are shown.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {apiKeys.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No active keys. Create one to start calling the API.
            </p>
          )}
          <div className="space-y-3">
            {apiKeys.map((apiKey) => (
              <div
                key={apiKey.id}
                className="grid gap-3 rounded-md border border-border bg-background/50 p-4 md:grid-cols-2"
              >
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">{apiKey.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Prefix: {apiKey.keyPrefix}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Scopes: {apiKey.scopes.join(", ") || "n/a"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    IP whitelist: {apiKey.ipWhitelist.join(", ") || "None"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created by:{" "}
                    {apiKey.createdBy.firstName || apiKey.createdBy.email || "Unknown"}
                  </p>
                </div>
                <div className="space-y-1 text-sm">
                  <p>
                    Expires:{" "}
                    {apiKey.expiresAt ? new Date(apiKey.expiresAt).toLocaleString() : "Never"}
                  </p>
                  <p>Last used: {apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).toLocaleString() : "Never"}</p>
                  <p>Usage: {apiKey.usageCount} requests</p>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevoke(apiKey.id)}
                      disabled={!canManage || revokingId === apiKey.id}
                    >
                      {revokingId === apiKey.id ? "Revoking…" : "Revoke"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
