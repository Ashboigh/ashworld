"use client";

import { useMemo, useState } from "react";
import { Controller, useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@repo/ui";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";

const parseNumber = z.preprocess((value) => {
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return undefined;
    }
    return parsed;
  }
  return value;
}, z.number());

const securitySchema = z.object({
  passwordMinLength: parseNumber.pipe(z.number().min(6, "Minimum length is 6").max(128)),
  passwordRequireUpper: z.boolean(),
  passwordRequireLower: z.boolean(),
  passwordRequireNumber: z.boolean(),
  passwordRequireSpecial: z.boolean(),
  sessionTimeoutMinutes: parseNumber.pipe(z.number().min(5, "Minimum 5 minutes").max(525600)),
  mfaRequired: z.boolean(),
  mfaRequiredRoles: z.string().optional(),
  ipWhitelistEnabled: z.boolean(),
  allowedIPs: z.string().optional(),
});

type SecurityFormValues = z.infer<typeof securitySchema>;

interface SecuritySettingsFormProps {
  organizationId: string;
  canEdit: boolean;
  policy: SecurityFormValues;
}

export function SecuritySettingsForm({
  organizationId,
  canEdit,
  policy,
}: SecuritySettingsFormProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<SecurityFormValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: policy,
    mode: "onChange",
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isDirty },
  } = form;

  const allowedIPsValue = watch("allowedIPs") ?? "";
  const mfaRolesValue = watch("mfaRequiredRoles") ?? "";

  const allowedCount = useMemo(() => {
    const values = allowedIPsValue
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    return values.length;
  }, [allowedIPsValue]);

  const onSubmit = async (values: SecurityFormValues) => {
    if (!canEdit) return;

    setIsSaving(true);

    try {
      const payload = {
        passwordMinLength: values.passwordMinLength,
        passwordRequireUpper: values.passwordRequireUpper,
        passwordRequireLower: values.passwordRequireLower,
        passwordRequireNumber: values.passwordRequireNumber,
        passwordRequireSpecial: values.passwordRequireSpecial,
        sessionTimeoutMinutes: values.sessionTimeoutMinutes,
        mfaRequired: values.mfaRequired,
        mfaRequiredRoles: values.mfaRequiredRoles
          ? values.mfaRequiredRoles
              .split(/[\s,]+/)
              .map((role) => role.trim())
              .filter(Boolean)
          : [],
        ipWhitelistEnabled: values.ipWhitelistEnabled,
        allowedIPs: values.allowedIPs
          ? values.allowedIPs
              .split(/[\s,]+/)
              .map((ip) => ip.trim())
              .filter(Boolean)
          : [],
      };

      const response = await fetch(
        `/api/organizations/${organizationId}/security`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to save security policy");
        return;
      }

      toast.success("Security policy saved");
      form.reset(values);
    } catch (error) {
      console.error("Security policy error", error);
      toast.error("Failed to save security policy");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="space-y-6">
      <CardHeader>
        <CardTitle>Security policy</CardTitle>
        <CardDescription>
          Control passwords, sessions, MFA, and IP access for your organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-semibold">Password minimum length</label>
            <Input
              type="number"
              {...register("passwordMinLength", { valueAsNumber: true })}
              min={6}
              max={128}
              disabled={!canEdit}
            />
            {errors.passwordMinLength && (
              <p className="text-xs text-destructive">
                {errors.passwordMinLength.message}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold">Session timeout (minutes)</label>
            <Input
              type="number"
              {...register("sessionTimeoutMinutes", { valueAsNumber: true })}
              min={5}
              max={525600}
              disabled={!canEdit}
            />
            {errors.sessionTimeoutMinutes && (
              <p className="text-xs text-destructive">
                {errors.sessionTimeoutMinutes.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <PolicyToggle
            label="Require uppercase"
            description="Password must include at least one uppercase letter."
            control={control}
            name="passwordRequireUpper"
            disabled={!canEdit}
          />
          <PolicyToggle
            label="Require lowercase"
            description="Password must include at least one lowercase letter."
            control={control}
            name="passwordRequireLower"
            disabled={!canEdit}
          />
          <PolicyToggle
            label="Require numbers"
            description="Password must include at least one digit."
            control={control}
            name="passwordRequireNumber"
            disabled={!canEdit}
          />
          <PolicyToggle
            label="Require special characters"
            description="Password must include symbols like !@#$%."
            control={control}
            name="passwordRequireSpecial"
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-4">
          <PolicyToggle
            label="Require MFA"
            description="Users listed in the roles field must enroll in MFA."
            control={control}
            name="mfaRequired"
            disabled={!canEdit}
          />
          <div className="space-y-1">
            <label className="text-sm font-semibold">Roles requiring MFA</label>
            <Input
              {...register("mfaRequiredRoles")}
              placeholder="org_admin workspace_admin"
              disabled={!canEdit}
            />
            <p className="text-xs text-muted-foreground">
              Space or comma separated role keys. Leave blank to apply to everyone.
            </p>
            {mfaRolesValue && (
              <p className="text-xs text-muted-foreground">
                {mfaRolesValue.split(/[\s,]+/).filter(Boolean).length} roles
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <PolicyToggle
            label="Enable IP whitelist"
            description="Only allow logins from these IP addresses or CIDRs."
            control={control}
            name="ipWhitelistEnabled"
            disabled={!canEdit}
          />
          <div className="space-y-1">
            <label className="text-sm font-semibold">Allowed IPs / CIDRs</label>
            <Textarea
              {...register("allowedIPs")}
              placeholder="192.168.0.0/24, 203.0.113.42"
              className="h-28"
              disabled={!canEdit}
            />
            <p className="text-xs text-muted-foreground">
              Enter comma/newline separated IPv4 ranges with optional masks.
            </p>
            <p className="text-xs text-muted-foreground">
              {allowedCount} entries configured
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={!isDirty || !canEdit || isSaving}
          >
            {isSaving ? "Saving…" : "Save policy"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface PolicyToggleProps {
  label: string;
  description: string;
  name:
    | "passwordRequireUpper"
    | "passwordRequireLower"
    | "passwordRequireNumber"
    | "passwordRequireSpecial"
    | "mfaRequired"
    | "ipWhitelistEnabled";
  control: Control<SecurityFormValues>;
  disabled?: boolean;
}

function PolicyToggle({
  label,
  description,
  name,
  control,
  disabled,
}: PolicyToggleProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <Switch
            checked={field.value}
            onCheckedChange={field.onChange}
            disabled={disabled}
          />
        </div>
      )}
    />
  );
}
