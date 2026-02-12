"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@repo/ui";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SSOProvider, SSOTestResult } from "@/lib/sso/types";
import { cn } from "@/lib/utils";
import { z } from "zod";

const optionalTextField = z
  .string()
  .optional()
  .transform((value) => {
    if (!value) return undefined;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  });

const ssoSettingsSchema = z.object({
  provider: z.enum(["saml", "oidc"]),
  enabled: z.boolean(),
  enforceSSO: z.boolean(),
  samlEntryPoint: optionalTextField,
  samlIssuer: optionalTextField,
  samlCertificate: optionalTextField,
  oidcClientId: optionalTextField,
  oidcClientSecret: optionalTextField,
  oidcIssuerUrl: optionalTextField,
  oidcScopes: z.string().optional(),
  allowedDomains: z.string().optional(),
});

type SSOSettingsFormValues = z.infer<typeof ssoSettingsSchema>;

interface SSOConfigPayload {
  provider: SSOProvider;
  enabled: boolean;
  enforceSSO: boolean;
  samlEntryPoint?: string | null;
  samlIssuer?: string | null;
  samlCertificate?: string | null;
  oidcClientId?: string | null;
  oidcClientSecret?: string | null;
  oidcIssuerUrl?: string | null;
  oidcScopes?: string[];
  allowedDomains?: string[];
  lastTestedAt?: string | null;
  testStatus?: string | null;
}

interface CallbackUrls {
  saml: string;
  oidc: string;
  samlMetadata: string;
}

interface SSOSettingsPanelProps {
  organizationId: string;
  ssoConfig: SSOConfigPayload | null;
  callbackUrls: CallbackUrls;
}

export function SSOSettingsPanel({
  organizationId,
  ssoConfig,
  callbackUrls,
}: SSOSettingsPanelProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<SSOTestResult | null>(null);
  const [lastTestedAt, setLastTestedAt] = useState<string | null>(
    ssoConfig?.lastTestedAt ?? null
  );

  const defaultScopes = ssoConfig?.oidcScopes?.join(" ") ?? "openid email profile";
  const defaultDomains =
    ssoConfig?.allowedDomains?.join(", ") ?? "";

  const form = useForm<SSOSettingsFormValues>({
    resolver: zodResolver(ssoSettingsSchema),
    defaultValues: {
      provider: ssoConfig?.provider ?? "saml",
      enabled: ssoConfig?.enabled ?? false,
      enforceSSO: ssoConfig?.enforceSSO ?? false,
      samlEntryPoint: ssoConfig?.samlEntryPoint ?? "",
      samlIssuer: ssoConfig?.samlIssuer ?? "",
      samlCertificate: ssoConfig?.samlCertificate ?? "",
      oidcClientId: ssoConfig?.oidcClientId ?? "",
      oidcClientSecret: ssoConfig?.oidcClientSecret ?? "",
      oidcIssuerUrl: ssoConfig?.oidcIssuerUrl ?? "",
      oidcScopes: defaultScopes,
      allowedDomains: defaultDomains,
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { isDirty },
    setValue,
  } = form;

  const provider = watch("provider");

  const onSubmit = async (values: SSOSettingsFormValues) => {
    setIsSaving(true);
    try {
      const payload = {
        provider: values.provider,
        enabled: values.enabled,
        enforceSSO: values.enforceSSO,
        samlEntryPoint: values.samlEntryPoint ?? null,
        samlIssuer: values.samlIssuer ?? null,
        samlCertificate: values.samlCertificate ?? null,
        oidcClientId: values.oidcClientId ?? null,
        oidcClientSecret: values.oidcClientSecret ?? null,
        oidcIssuerUrl: values.oidcIssuerUrl ?? null,
        oidcScopes: values.oidcScopes
          ? values.oidcScopes
              .split(/[\\s,]+/)
              .map((scope) => scope.trim())
              .filter(Boolean)
          : [],
        allowedDomains: values.allowedDomains
          ? values.allowedDomains
              .split(/[\\s,]+/)
              .map((domain) => domain.trim())
              .filter(Boolean)
          : [],
      };

      const response = await fetch(`/api/organizations/${organizationId}/sso`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to save SSO configuration");
        return;
      }

      toast.success("SSO configuration saved");
      setTestResult(null);
      form.reset(values);
    } catch (error) {
      console.error("SSO save error:", error);
      toast.error("Failed to save SSO configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConfiguration = async () => {
    setIsTesting(true);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/sso/test`,
        {
          method: "POST",
        }
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Failed to test SSO configuration");
      }

      const result: SSOTestResult = json.testResult;
      setTestResult(result);
      setLastTestedAt(new Date().toISOString());
      toast.success("SSO test completed");
    } catch (error) {
      console.error("SSO test error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to test SSO configuration"
      );
      setTestResult({ success: false, message: "Test failed" });
    } finally {
      setIsTesting(false);
    }
  };

  const formatDate = (timestamp?: string | null) => {
    if (!timestamp) return null;
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const providerButtons = [
    { value: "saml", label: "SAML 2.0" },
    { value: "oidc", label: "OIDC" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>SSO enforcement</CardTitle>
          <CardDescription>
            Toggle SSO enforcement and ensure every login is routed through your
            configured identity provider.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Enable SSO</p>
              <p className="text-xs text-muted-foreground">
                Users must authenticate via the selected provider.
              </p>
            </div>
            <Controller
              name="enabled"
              control={control}
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Enforce SSO</p>
              <p className="text-xs text-muted-foreground">
                Block password logins for this organization.
              </p>
            </div>
            <Controller
              name="enforceSSO"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="space-y-2">
        <CardHeader>
          <CardTitle>Provider configuration</CardTitle>
          <CardDescription>
            Configure one provider per organization, then test connectivity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2 sm:grid-cols-2">
            {providerButtons.map((option) => {
              const isActive = provider === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setValue("provider", option.value as SSOProvider)}
                  className={cn(
                    "rounded-md border p-3 text-left transition",
                    isActive
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary"
                  )}
                >
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {option.value === "saml"
                      ? "SAML 2.0, compatible with Okta, Azure AD, and others."
                      : "OIDC flows for Okta, Azure AD, and Google Workspace."}
                  </p>
                </button>
              );
            })}
          </div>

          {provider === "saml" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Entry point URL</label>
                <Input
                  {...register("samlEntryPoint")}
                  placeholder="https://idp.example.com/sso/saml"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Issuer</label>
                <Input
                  {...register("samlIssuer")}
                  placeholder="https://service-provider"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-semibold">Certificate</label>
                <Textarea
                  {...register("samlCertificate")}
                  placeholder="-----BEGIN CERTIFICATE-----..."
                />
              </div>
            </div>
          )}

          {provider === "oidc" && (
            <div className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Client ID</label>
                  <Input {...register("oidcClientId")} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Client Secret</label>
                  <Input {...register("oidcClientSecret")} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Issuer URL</label>
                  <Input
                    {...register("oidcIssuerUrl")}
                    placeholder="https://example.okta.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Scopes</label>
                  <Input {...register("oidcScopes")} />
                  <p className="text-xs text-muted-foreground">
                    Space or comma separated (default: openid email profile).
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold">Allowed domains</label>
            <Input
              {...register("allowedDomains")}
              placeholder="example.com, acme.com"
            />
            <p className="text-xs text-muted-foreground">
              Limit logins to specific email domains (optional).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="space-y-4">
        <CardHeader>
          <CardTitle>SSO endpoints</CardTitle>
          <CardDescription>
            Provide these URLs to your identity provider when configuring the
            service provider side.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              SAML callback URL
            </p>
            <div className="flex items-center gap-2">
              <Input value={callbackUrls.saml} readOnly />
              <Button variant="outline" size="sm" onClick={() => {
                navigator.clipboard.writeText(callbackUrls.saml);
                toast.success("Copied SAML callback URL");
              }}>
                Copy
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              OIDC callback URL
            </p>
            <div className="flex items-center gap-2">
              <Input value={callbackUrls.oidc} readOnly />
              <Button variant="outline" size="sm" onClick={() => {
                navigator.clipboard.writeText(callbackUrls.oidc);
                toast.success("Copied OIDC callback URL");
              }}>
                Copy
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              SAML metadata URL
            </p>
            <div className="flex items-center gap-2">
              <Input value={callbackUrls.samlMetadata} readOnly />
              <Button variant="outline" size="sm" onClick={() => {
                navigator.clipboard.writeText(callbackUrls.samlMetadata);
                toast.success("Copied metadata URL");
              }}>
                Copy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test connection</CardTitle>
          <CardDescription>
            Validate that the configuration can reach your identity provider.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {lastTestedAt && (
            <p className="text-sm">
              Last tested: <span className="font-semibold">{formatDate(lastTestedAt)}</span>
            </p>
          )}
          {testResult && (
            <p
              className={cn(
                "rounded-md border px-3 py-2 text-sm",
                testResult.success ? "border-emerald-500 bg-emerald-500/10" : "border-destructive bg-destructive/10"
              )}
            >
              {testResult.message}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={handleTestConfiguration} disabled={isTesting}>
              {isTesting ? "Testing…" : "Test configuration"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSubmit(onSubmit)}
              disabled={isSaving || !isDirty}
            >
              {isSaving ? "Saving…" : "Save configuration"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
