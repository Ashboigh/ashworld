"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface EndNodeProps {
  selected?: boolean;
}

function EndNodeComponent({
  selected,
}: EndNodeProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-3 rounded-full border-2 bg-background shadow-md transition-all",
        selected
          ? "border-red-500 ring-2 ring-red-500/20"
          : "border-red-500/50"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-background"
      />

      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500">
        <Square className="w-4 h-4 text-white" />
      </div>
      <span className="font-medium text-sm pr-2">End</span>
    </div>
  );
}

export const EndNode = memo(EndNodeComponent);
