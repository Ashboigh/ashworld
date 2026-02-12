"use client";

import { X } from "lucide-react";
import { Button, Input, Label } from "@repo/ui";
import { NODE_METADATA, type NodeType, type WorkflowNodeData } from "@/lib/workflow";

interface BaseConfigPanelProps {
  nodeId: string;
  nodeType: NodeType;
  nodeData: WorkflowNodeData;
  onClose: () => void;
  onUpdateConfig: (config: Record<string, unknown>) => void;
  onUpdateLabel: (label: string) => void;
  children?: React.ReactNode;
}

export function BaseConfigPanel({
  nodeId,
  nodeType,
  nodeData,
  onClose,
  onUpdateLabel,
  children,
}: BaseConfigPanelProps) {
  const meta = NODE_METADATA[nodeType];

  return (
    <div className="w-80 border-l bg-background overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">{meta.label} Settings</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="node-label">Node Label</Label>
          <Input
            id="node-label"
            value={nodeData.label || ""}
            onChange={(e) => onUpdateLabel(e.target.value)}
            placeholder={meta.label}
          />
        </div>

        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
          Node ID: {nodeId}
        </div>

        {children}
      </div>
    </div>
  );
}
