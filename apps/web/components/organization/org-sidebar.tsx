"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  GitBranch,
  Database,
  MessageSquare,
  BarChart3,
  Settings,
  Users,
  Layers,
  CreditCard,
  Shield,
  Key,
  KeyRound,
  Monitor,
  ScrollText,
  Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hasPermission, Permission, OrgRoleType } from "@/lib/permissions";

interface OrgSidebarProps {
  orgSlug: string;
  userRole: OrgRoleType;
}

export function OrgSidebar({ orgSlug, userRole }: OrgSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Dashboard",
      href: `/${orgSlug}`,
      icon: LayoutDashboard,
      permission: Permission.ORG_VIEW,
    },
    {
      label: "Workspaces",
      href: `/${orgSlug}/workspaces`,
      icon: Layers,
      permission: Permission.WORKSPACE_VIEW,
    },
    {
      label: "Chatbots",
      href: `/${orgSlug}/chatbots`,
      icon: Bot,
      permission: Permission.CHATBOT_VIEW,
    },
    {
      label: "Workflows",
      href: `/${orgSlug}/workflows`,
      icon: GitBranch,
      permission: Permission.WORKFLOW_VIEW,
    },
    {
      label: "Knowledge Bases",
      href: `/${orgSlug}/knowledge-bases`,
      icon: Database,
      permission: Permission.KB_VIEW,
    },
    {
      label: "Conversations",
      href: `/${orgSlug}/conversations`,
      icon: MessageSquare,
      permission: Permission.CONVERSATION_VIEW,
    },
    {
      label: "Live Chat",
      href: `/${orgSlug}/live-chat`,
      icon: MessageSquare,
      permission: Permission.LIVE_CHAT_VIEW,
    },
    {
      label: "Analytics",
      href: `/${orgSlug}/analytics`,
      icon: BarChart3,
      permission: Permission.ANALYTICS_VIEW,
    },
  ];

  const settingsItems = [
    {
      label: "General",
      href: `/${orgSlug}/settings`,
      icon: Settings,
      permission: Permission.ORG_VIEW,
    },
    {
      label: "Members",
      href: `/${orgSlug}/settings/members`,
      icon: Users,
      permission: Permission.ORG_VIEW,
    },
    {
      label: "Billing",
      href: `/${orgSlug}/settings/billing`,
      icon: CreditCard,
      permission: Permission.ORG_MANAGE_BILLING,
    },
    {
      label: "Security",
      href: `/${orgSlug}/settings/security`,
      icon: Shield,
      permission: Permission.ORG_MANAGE_SECURITY,
    },
    {
      label: "SSO",
      href: `/${orgSlug}/settings/sso`,
      icon: KeyRound,
      permission: Permission.ORG_MANAGE_SSO,
    },
    {
      label: "Integrations",
      href: `/${orgSlug}/settings/integrations`,
      icon: Plug,
      permission: Permission.ORG_UPDATE,
    },
    {
      label: "API Keys",
      href: `/${orgSlug}/settings/api-keys`,
      icon: Key,
      permission: Permission.ORG_VIEW_API_KEYS,
    },
    {
      label: "Sessions",
      href: `/${orgSlug}/settings/sessions`,
      icon: Monitor,
      permission: Permission.ORG_MANAGE_SESSIONS,
    },
    {
      label: "Audit Logs",
      href: `/${orgSlug}/settings/audit-logs`,
      icon: ScrollText,
      permission: Permission.ORG_VIEW_AUDIT_LOGS,
    },
  ];

  return (
    <aside className="w-64 border-r bg-muted/30 min-h-[calc(100vh-3.5rem)]">
      <nav className="p-4 space-y-6">
        <div className="space-y-1">
          {navItems
            .filter((item) => hasPermission(userRole, item.permission))
            .map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== `/${orgSlug}` && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
        </div>

        <div className="space-y-1">
          <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Settings
          </p>
          {settingsItems
            .filter((item) => hasPermission(userRole, item.permission))
            .map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
        </div>
      </nav>
    </aside>
  );
}
