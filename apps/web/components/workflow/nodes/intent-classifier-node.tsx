"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowNodeData } from "@/lib/workflow";

interface Intent {
  name: string;
  description: string;
}

interface IntentClassifierNodeProps {
  data: WorkflowNodeData;
  selected?: boolean;
}

function IntentClassifierNodeComponent({
  data,
  selected,
}: IntentClassifierNodeProps) {
  const config = data.config as {
    intents?: Intent[];
  };

  const intents = config.intents || [];

  return (
    <div
      className={cn(
        "min-w-[200px] rounded-lg border-2 bg-background shadow-md transition-all",
        selected
          ? "border-purple-500 ring-2 ring-purple-500/20"
          : "border-border"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
      />

      <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-purple-500/20">
        <div className="flex items-center justify-center w-6 h-6 rounded bg-purple-500">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <span className="font-medium text-sm">{data.label || "Intent Classifier"}</span>
      </div>

      <div className="px-3 py-2 text-xs text-muted-foreground">
        Classify into {intents.length} intents
      </div>

      <div className="flex flex-wrap gap-2 px-3 pb-3">
        {intents.map((intent, index) => (
          <div key={index} className="relative text-xs">
            <Handle
              type="source"
              position={Position.Bottom}
              id={`intent-${intent.name}`}
              className="!w-2.5 !h-2.5 !bg-purple-500 !border-2 !border-background"
              style={{ left: "50%", bottom: "-12px" }}
            />
            <span className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
              {intent.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const IntentClassifierNode = memo(IntentClassifierNodeComponent);
