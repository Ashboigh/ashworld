"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowNodeData } from "@/lib/workflow";

interface ConditionNodeProps {
  data: WorkflowNodeData;
  selected?: boolean;
}

function ConditionNodeComponent({
  data,
  selected,
}: ConditionNodeProps) {
  const config = data.config as {
    variable?: string;
    operator?: string;
    value?: string;
  };

  return (
    <div
      className={cn(
        "min-w-[200px] rounded-lg border-2 bg-background shadow-md transition-all",
        selected
          ? "border-amber-500 ring-2 ring-amber-500/20"
          : "border-border"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
      />

      <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-amber-500/20">
        <div className="flex items-center justify-center w-6 h-6 rounded bg-amber-500">
          <GitBranch className="w-4 h-4 text-white" />
        </div>
        <span className="font-medium text-sm">{data.label || "Condition"}</span>
      </div>

      <div className="px-3 py-2 text-xs text-muted-foreground">
        {config.variable ? (
          <code className="bg-muted px-1 rounded">
            {config.variable} {config.operator} {config.value}
          </code>
        ) : (
          "Configure condition"
        )}
      </div>

      <div className="flex justify-between px-3 pb-2 text-xs">
        <div className="relative">
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="!w-3 !h-3 !bg-green-500 !border-2 !border-background !left-0 !-bottom-3"
          />
          <span className="text-green-600 font-medium">True</span>
        </div>
        <div className="relative">
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!w-3 !h-3 !bg-red-500 !border-2 !border-background !right-0 !-bottom-3"
          />
          <span className="text-red-600 font-medium">False</span>
        </div>
      </div>
    </div>
  );
}

export const ConditionNode = memo(ConditionNodeComponent);
