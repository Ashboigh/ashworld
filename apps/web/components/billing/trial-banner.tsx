"use client";

import { useState } from "react";
import { X, Clock, Zap } from "lucide-react";
import { Button } from "@repo/ui";
import Link from "next/link";

interface TrialBannerProps {
  daysRemaining: number;
  orgSlug: string;
}

export function TrialBanner({ daysRemaining, orgSlug }: TrialBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || daysRemaining <= 0) {
    return null;
  }

  const isUrgent = daysRemaining <= 3;

  return (
    <div
      className={`relative px-4 py-3 ${
        isUrgent
          ? "bg-yellow-500/10 border-yellow-500/20"
          : "bg-blue-500/10 border-blue-500/20"
      } border-b`}
    >
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Clock
            className={`w-5 h-5 ${
              isUrgent ? "text-yellow-600" : "text-blue-600"
            }`}
          />
          <p className="text-sm">
            <span className="font-medium">
              {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left in your trial.
            </span>
            <span className="text-muted-foreground ml-1">
              Upgrade now to keep your features.
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant={isUrgent ? "default" : "secondary"}>
            <Link href={`/${orgSlug}/settings/billing`}>
              <Zap className="w-4 h-4 mr-1" />
              Upgrade Now
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsDismissed(true)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
