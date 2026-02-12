"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowNodeData } from "@/lib/workflow";

interface ButtonOption {
  label: string;
  value: string;
}

interface ButtonsNodeProps {
  data: WorkflowNodeData;
  selected?: boolean;
}

function ButtonsNodeComponent({
  data,
  selected,
}: ButtonsNodeProps) {
  const config = data.config as {
    message?: string;
    buttons?: ButtonOption[];
  };

  const buttons = config.buttons || [];

  return (
    <div
      className={cn(
        "min-w-[200px] rounded-lg border-2 bg-background shadow-md transition-all",
        selected
          ? "border-blue-500 ring-2 ring-blue-500/20"
          : "border-border"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
      />

      <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-blue-500/20">
        <div className="flex items-center justify-center w-6 h-6 rounded bg-blue-500">
          <LayoutGrid className="w-4 h-4 text-white" />
        </div>
        <span className="font-medium text-sm">{data.label || "Buttons"}</span>
      </div>

      <div className="px-3 py-2 text-xs text-muted-foreground line-clamp-2">
        {config.message || "Select an option"}
      </div>

      <div className="flex flex-wrap gap-2 px-3 pb-3">
        {buttons.map((btn, index) => (
          <div key={index} className="relative text-xs">
            <Handle
              type="source"
              position={Position.Bottom}
              id={`btn-${index}`}
              className="!w-2.5 !h-2.5 !bg-blue-500 !border-2 !border-background"
              style={{ left: "50%", bottom: "-12px" }}
            />
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
              {btn.label || `Button ${index + 1}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const ButtonsNode = memo(ButtonsNodeComponent);
