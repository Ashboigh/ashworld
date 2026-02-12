"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@repo/ui";
import {
  updateOrganizationSchema,
  type UpdateOrganizationInput,
} from "@/lib/validations/organization";
import type { OrganizationWithRole } from "@/lib/organization";

interface GeneralSettingsFormProps {
  organization: OrganizationWithRole & { settings: unknown };
  canEdit: boolean;
}

export function GeneralSettingsForm({
  organization,
  canEdit,
}: GeneralSettingsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UpdateOrganizationInput>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: {
      name: organization.name,
      logoUrl: organization.logoUrl,
    },
  });

  const onSubmit = async (data: UpdateOrganizationInput) => {
    if (!canEdit) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to update organization");
        return;
      }

      toast.success("Organization updated successfully");
      router.refresh();
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Details</CardTitle>
        <CardDescription>
          Update your organization&apos;s basic information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization name</Label>
            <Input
              id="name"
              disabled={!canEdit || isLoading}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              type="url"
              placeholder="https://example.com/logo.png"
              disabled={!canEdit || isLoading}
              {...register("logoUrl")}
            />
            {errors.logoUrl && (
              <p className="text-sm text-destructive">
                {errors.logoUrl.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Enter a URL to your organization&apos;s logo
            </p>
          </div>

          <div className="space-y-2">
            <Label>Organization slug</Label>
            <Input value={organization.slug} disabled />
            <p className="text-xs text-muted-foreground">
              The URL slug cannot be changed
            </p>
          </div>

          {canEdit && (
            <Button type="submit" disabled={isLoading || !isDirty}>
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                "Save changes"
              )}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
