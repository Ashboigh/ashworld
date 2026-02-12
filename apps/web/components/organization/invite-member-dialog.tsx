"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button, Input, Label } from "@repo/ui";
import {
  inviteMemberSchema,
  type InviteMemberInput,
} from "@/lib/validations/organization";
import {
  OrgRoleType,
  ROLE_DISPLAY_NAMES,
  ROLE_DESCRIPTIONS,
  getAvailableRolesToAssign,
} from "@/lib/permissions";

interface InviteMemberDialogProps {
  organizationId: string;
  userRole: OrgRoleType;
}

export function InviteMemberDialog({
  organizationId,
  userRole,
}: InviteMemberDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const availableRoles = getAvailableRolesToAssign(userRole);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      role: availableRoles[0] || "viewer",
    },
  });

  const onSubmit = async (data: InviteMemberInput) => {
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to send invitation");
        return;
      }

      toast.success("Invitation sent successfully");
      reset();
      setIsOpen(false);
      router.refresh();
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (availableRoles.length === 0) {
    return null;
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <UserPlus className="h-4 w-4 mr-2" />
        Invite member
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative bg-background rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Invite team member</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  disabled={isLoading}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  disabled={isLoading}
                  {...register("role")}
                >
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_DISPLAY_NAMES[role]}
                    </option>
                  ))}
                </select>
                {errors.role && (
                  <p className="text-sm text-destructive">
                    {errors.role.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {ROLE_DESCRIPTIONS[availableRoles[0] as OrgRoleType]}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Send invitation"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
