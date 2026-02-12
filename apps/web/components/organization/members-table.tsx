"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Shield, Trash2 } from "lucide-react";
import {
  Button,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@repo/ui";
import {
  OrgRoleType,
  ROLE_DISPLAY_NAMES,
  canManageRole,
  getAvailableRolesToAssign,
} from "@/lib/permissions";

interface Member {
  id: string;
  role: string;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
  };
}

interface MembersTableProps {
  members: Member[];
  currentUserId: string;
  organizationId: string;
  userRole: OrgRoleType;
  canManage: boolean;
}

export function MembersTable({
  members,
  currentUserId,
  organizationId,
  userRole,
  canManage,
}: MembersTableProps) {
  const router = useRouter();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    setIsLoading(memberId);
    setOpenMenuId(null);

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/members/${memberId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to update role");
        return;
      }

      toast.success("Role updated successfully");
      router.refresh();
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) {
      return;
    }

    setIsLoading(memberId);
    setOpenMenuId(null);

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/members/${memberId}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to remove member");
        return;
      }

      toast.success("Member removed successfully");
      router.refresh();
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(null);
    }
  };

  const availableRoles = getAvailableRolesToAssign(userRole);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members ({members.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {members.map((member) => {
            const isCurrentUser = member.user.id === currentUserId;
            const canManageMember =
              canManage &&
              !isCurrentUser &&
              canManageRole(userRole, member.role as OrgRoleType);

            const initials =
              member.user.firstName && member.user.lastName
                ? `${member.user.firstName[0]}${member.user.lastName[0]}`
                : member.user.email[0]?.toUpperCase() || "U";

            const displayName =
              member.user.firstName && member.user.lastName
                ? `${member.user.firstName} ${member.user.lastName}`
                : member.user.email;

            return (
              <div
                key={member.id}
                className="flex items-center justify-between py-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={member.user.image || undefined} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {displayName}
                      {isCurrentUser && (
                        <span className="text-muted-foreground ml-2">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {member.user.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground px-2 py-1 bg-muted rounded">
                    {ROLE_DISPLAY_NAMES[member.role as OrgRoleType] ||
                      member.role}
                  </span>

                  {canManageMember && (
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={isLoading === member.id}
                        onClick={() =>
                          setOpenMenuId(
                            openMenuId === member.id ? null : member.id
                          )
                        }
                      >
                        {isLoading === member.id ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </Button>

                      {openMenuId === member.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 rounded-md border bg-popover shadow-lg z-10">
                          <div className="p-1">
                            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                              Change role
                            </p>
                            {availableRoles.map((role) => (
                              <button
                                key={role}
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                                onClick={() => handleUpdateRole(member.id, role)}
                              >
                                <Shield className="h-4 w-4" />
                                {ROLE_DISPLAY_NAMES[role]}
                              </button>
                            ))}
                            <div className="my-1 border-t" />
                            <button
                              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Remove member
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
