"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Split } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowNodeData } from "@/lib/workflow";

interface SwitchCase {
  value: string;
  label: string;
}

interface SwitchNodeProps {
  data: WorkflowNodeData;
  selected?: boolean;
}

function SwitchNodeComponent({
  data,
  selected,
}: SwitchNodeProps) {
  const config = data.config as {
    variable?: string;
    cases?: SwitchCase[];
    defaultCase?: boolean;
  };

  const cases = config.cases || [];
  const showDefault = config.defaultCase !== false;

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
          <Split className="w-4 h-4 text-white" />
        </div>
        <span className="font-medium text-sm">{data.label || "Switch"}</span>
      </div>

      <div className="px-3 py-2 text-xs text-muted-foreground">
        {config.variable ? (
          <code className="bg-muted px-1 rounded">{config.variable}</code>
        ) : (
          "Configure variable"
        )}
      </div>

      <div className="flex flex-wrap gap-2 px-3 pb-3">
        {cases.map((c, index) => (
          <div key={index} className="relative text-xs">
            <Handle
              type="source"
              position={Position.Bottom}
              id={`case-${index}`}
              className="!w-2.5 !h-2.5 !bg-blue-500 !border-2 !border-background"
              style={{ left: "50%", bottom: "-12px" }}
            />
            <span className="bg-muted px-2 py-0.5 rounded">{c.label || c.value || `Case ${index + 1}`}</span>
          </div>
        ))}
        {showDefault && (
          <div className="relative text-xs">
            <Handle
              type="source"
              position={Position.Bottom}
              id="default"
              className="!w-2.5 !h-2.5 !bg-gray-500 !border-2 !border-background"
              style={{ left: "50%", bottom: "-12px" }}
            />
            <span className="bg-muted px-2 py-0.5 rounded text-muted-foreground">Default</span>
          </div>
        )}
      </div>
    </div>
  );
}

export const SwitchNode = memo(SwitchNodeComponent);
