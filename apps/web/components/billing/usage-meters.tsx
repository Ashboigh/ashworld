"use client";

import {
  MessageSquare,
  FolderKanban,
  Bot,
  Users,
  Database,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import { Progress } from "@/components/ui/progress";
import type { SerializedBillingInfo } from "@/types/billing";
import { formatLimit } from "@/lib/billing/plans";

interface UsageMetersProps {
  usage: SerializedBillingInfo["usage"];
}

interface UsageMeterProps {
  label: string;
  used: number;
  limit: number;
  percentage: number;
  icon: React.ReactNode;
}

function UsageMeter({ label, used, limit, percentage, icon }: UsageMeterProps) {
  const isUnlimited = limit === -1;
  const isNearLimit = percentage >= 80 && !isUnlimited;
  const isAtLimit = percentage >= 100 && !isUnlimited;

  const getProgressColor = () => {
    if (isUnlimited) return "bg-green-500";
    if (isAtLimit) return "bg-red-500";
    if (isNearLimit) return "bg-yellow-500";
    return "bg-primary";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <span className="font-medium">
          {used.toLocaleString()} / {formatLimit(limit)}
        </span>
      </div>
      <Progress
        value={isUnlimited ? 10 : Math.min(percentage, 100)}
        indicatorClassName={getProgressColor()}
      />
      {isAtLimit && (
        <p className="text-xs text-red-600 dark:text-red-400">
          You&apos;ve reached your limit. Upgrade to continue.
        </p>
      )}
      {isNearLimit && !isAtLimit && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400">
          Approaching limit ({percentage.toFixed(0)}% used)
        </p>
      )}
    </div>
  );
}

export function UsageMeters({ usage }: UsageMetersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage</CardTitle>
        <CardDescription>
          Track your resource usage for the current billing period
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <UsageMeter
          label="Messages"
          used={usage.messages.used}
          limit={usage.messages.limit}
          percentage={usage.messages.percentage}
          icon={<MessageSquare className="w-4 h-4" />}
        />
        <UsageMeter
          label="Workspaces"
          used={usage.workspaces.used}
          limit={usage.workspaces.limit}
          percentage={usage.workspaces.percentage}
          icon={<FolderKanban className="w-4 h-4" />}
        />
        <UsageMeter
          label="Chatbots"
          used={usage.chatbots.used}
          limit={usage.chatbots.limit}
          percentage={usage.chatbots.percentage}
          icon={<Bot className="w-4 h-4" />}
        />
        <UsageMeter
          label="Team Members"
          used={usage.members.used}
          limit={usage.members.limit}
          percentage={usage.members.percentage}
          icon={<Users className="w-4 h-4" />}
        />
        <UsageMeter
          label="Knowledge Bases"
          used={usage.knowledgeBases.used}
          limit={usage.knowledgeBases.limit}
          percentage={usage.knowledgeBases.percentage}
          icon={<Database className="w-4 h-4" />}
        />
      </CardContent>
    </Card>
  );
}
