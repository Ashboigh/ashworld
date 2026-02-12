"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import {
  Play,
  Bot,
  Search,
  Brain,
  GitBranch,
  Split,
  MessageSquare,
  LayoutGrid,
  FormInput,
  Variable,
  Globe,
  UserCheck,
  Square,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowNodeData, NodeType, NODE_METADATA } from "@/lib/workflow";

const iconMap: Record<string, LucideIcon> = {
  Play,
  Bot,
  Search,
  Brain,
  GitBranch,
  Split,
  MessageSquare,
  LayoutGrid,
  FormInput,
  Variable,
  Globe,
  UserCheck,
  Square,
};

interface BaseNodeProps {
  data: WorkflowNodeData;
  meta: (typeof NODE_METADATA)[NodeType];
  selected?: boolean;
}

function BaseNodeComponent({ data, meta, selected }: BaseNodeProps) {
  const Icon = iconMap[meta.icon] || Square;
  const hasInput = meta.maxInputs > 0;
  const hasOutput = meta.maxOutputs > 0;

  return (
    <div
      className={cn(
        "min-w-[180px] rounded-lg border-2 bg-background shadow-md transition-all",
        selected ? "border-primary ring-2 ring-primary/20" : "border-border"
      )}
    >
      {hasInput && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
        />
      )}

      <div
        className="flex items-center gap-2 px-3 py-2 rounded-t-lg"
        style={{ backgroundColor: `${meta.color}20` }}
      >
        <div
          className="flex items-center justify-center w-6 h-6 rounded"
          style={{ backgroundColor: meta.color }}
        >
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="font-medium text-sm">{data.label || meta.label}</span>
      </div>

      <div className="px-3 py-2 text-xs text-muted-foreground">
        {meta.description}
      </div>

      {hasOutput && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
        />
      )}
    </div>
  );
}

export const BaseNode = memo(BaseNodeComponent);
