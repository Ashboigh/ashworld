"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock, X } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardContent } from "@repo/ui";
import { ROLE_DISPLAY_NAMES, OrgRoleType } from "@/lib/permissions";

interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: Date;
  invitedBy: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

interface PendingInvitationsProps {
  invitations: Invitation[];
  organizationId: string;
}

export function PendingInvitations({
  invitations,
  organizationId,
}: PendingInvitationsProps) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState<string | null>(null);

  const handleCancel = async (invitationId: string) => {
    setCancelling(invitationId);

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/invitations/${invitationId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const result = await response.json();
        toast.error(result.error || "Failed to cancel invitation");
        return;
      }

      toast.success("Invitation cancelled");
      router.refresh();
    } catch {
      toast.error("An error occurred");
    } finally {
      setCancelling(null);
    }
  };

  const formatTimeLeft = (expiresAt: Date) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? "s" : ""} left`;
    }
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} left`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pending Invitations ({invitations.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {invitations.map((invitation) => {
            const inviterName =
              invitation.invitedBy.firstName && invitation.invitedBy.lastName
                ? `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`
                : invitation.invitedBy.email;

            return (
              <div
                key={invitation.id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="font-medium">{invitation.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {ROLE_DISPLAY_NAMES[invitation.role as OrgRoleType] ||
                      invitation.role}{" "}
                    &middot; Invited by {inviterName} &middot;{" "}
                    {formatTimeLeft(invitation.expiresAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={cancelling === invitation.id}
                  onClick={() => handleCancel(invitation.id)}
                >
                  {cancelling === invitation.id ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
