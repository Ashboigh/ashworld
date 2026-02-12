"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface StartNodeProps {
  selected?: boolean;
}

function StartNodeComponent({
  selected,
}: StartNodeProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-3 rounded-full border-2 bg-background shadow-md transition-all",
        selected
          ? "border-green-500 ring-2 ring-green-500/20"
          : "border-green-500/50"
      )}
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500">
        <Play className="w-4 h-4 text-white ml-0.5" />
      </div>
      <span className="font-medium text-sm pr-2">Start</span>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-background"
      />
    </div>
  );
}

export const StartNode = memo(StartNodeComponent);
