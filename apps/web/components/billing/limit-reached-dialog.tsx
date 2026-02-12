"use client";

import { AlertTriangle, Zap } from "lucide-react";
import { Button } from "@repo/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { formatLimit } from "@/lib/billing/plans";

interface LimitReachedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: string;
  current: number;
  limit: number;
  orgSlug: string;
}

const resourceLabels: Record<string, string> = {
  workspaces: "workspace",
  chatbots: "chatbot",
  members: "team member",
  knowledgeBases: "knowledge base",
  messages: "message",
};

export function LimitReachedDialog({
  open,
  onOpenChange,
  resource,
  current,
  limit,
  orgSlug,
}: LimitReachedDialogProps) {
  const resourceLabel = resourceLabels[resource] || resource;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <DialogTitle>
                {resourceLabel.charAt(0).toUpperCase() + resourceLabel.slice(1)} Limit Reached
              </DialogTitle>
              <DialogDescription>
                You&apos;ve reached your plan&apos;s {resourceLabel} limit
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">
              {current} / {formatLimit(limit)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {resourceLabel}s used
            </p>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Upgrade your plan to create more {resourceLabel}s and unlock additional
            features for your organization.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button asChild>
            <Link href={`/${orgSlug}/settings/billing`}>
              <Zap className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
