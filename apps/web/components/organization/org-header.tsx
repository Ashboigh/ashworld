"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  ChevronDown,
  Building2,
  Plus,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { Button, Avatar, AvatarFallback, AvatarImage, Separator } from "@repo/ui";
import { useState, useRef, useEffect } from "react";
import type { OrganizationWithRole } from "@/lib/organization";

interface OrgHeaderProps {
  organization: OrganizationWithRole;
  organizations: OrganizationWithRole[];
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function OrgHeader({
  organization,
  organizations,
  user,
}: OrgHeaderProps) {
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const orgDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        orgDropdownRef.current &&
        !orgDropdownRef.current.contains(event.target as Node)
      ) {
        setOrgDropdownOpen(false);
      }
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user.email?.[0]?.toUpperCase() || "U";

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Left side - Organization Switcher */}
        <div className="flex items-center gap-4">
          <Link href={`/${organization.slug}`} className="font-semibold">
            Enterprise Chatbot
          </Link>

          <Separator orientation="vertical" className="h-6" />

          {/* Organization Dropdown */}
          <div className="relative" ref={orgDropdownRef}>
            <Button
              variant="ghost"
              className="flex items-center gap-2"
              onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
            >
              {organization.logoUrl ? (
                <img
                  src={organization.logoUrl}
                  alt={organization.name}
                  className="w-5 h-5 rounded"
                />
              ) : (
                <Building2 className="w-5 h-5" />
              )}
              <span className="max-w-[150px] truncate">{organization.name}</span>
              <ChevronDown className="w-4 h-4" />
            </Button>

            {orgDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 rounded-md border bg-popover shadow-lg">
                <div className="p-2">
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                    Organizations
                  </p>
                  {organizations.map((org) => (
                    <Link
                      key={org.id}
                      href={`/${org.slug}`}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent ${
                        org.id === organization.id ? "bg-accent" : ""
                      }`}
                      onClick={() => setOrgDropdownOpen(false)}
                    >
                      {org.logoUrl ? (
                        <img
                          src={org.logoUrl}
                          alt={org.name}
                          className="w-5 h-5 rounded"
                        />
                      ) : (
                        <Building2 className="w-5 h-5" />
                      )}
                      <span className="flex-1 truncate">{org.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {org.role.replace("_", " ")}
                      </span>
                    </Link>
                  ))}
                  <Separator className="my-2" />
                  <Link
                    href="/onboarding"
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                    onClick={() => setOrgDropdownOpen(false)}
                  >
                    <Plus className="w-4 h-4" />
                    Create organization
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side - User Menu */}
        <div className="relative" ref={userDropdownRef}>
          <Button
            variant="ghost"
            className="flex items-center gap-2"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
          >
            <Avatar className="w-7 h-7">
              <AvatarImage src={user.image || undefined} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <ChevronDown className="w-4 h-4" />
          </Button>

          {userDropdownOpen && (
            <div className="absolute top-full right-0 mt-1 w-56 rounded-md border bg-popover shadow-lg">
              <div className="p-2">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.name || "User"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Separator className="my-2" />
                <Link
                  href={`/${organization.slug}/settings`}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <Settings className="w-4 h-4" />
                  Organization settings
                </Link>
                <button
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <User className="w-4 h-4" />
                  Account settings
                </button>
                <Separator className="my-2" />
                <button
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-accent"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
