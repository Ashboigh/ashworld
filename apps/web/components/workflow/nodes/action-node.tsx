"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import {
  Bot,
  Search,
  MessageSquare,
  FormInput,
  Variable,
  Globe,
  UserCheck,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NodeType, WorkflowNodeData } from "@/lib/workflow";

const iconMap: Record<string, LucideIcon> = {
  ai_response: Bot,
  knowledge_lookup: Search,
  send_message: MessageSquare,
  capture_input: FormInput,
  set_variable: Variable,
  api_call: Globe,
  human_handoff: UserCheck,
};

const colorMap: Record<string, string> = {
  ai_response: "#8b5cf6",
  knowledge_lookup: "#8b5cf6",
  send_message: "#3b82f6",
  capture_input: "#3b82f6",
  set_variable: "#3b82f6",
  api_call: "#3b82f6",
  human_handoff: "#ec4899",
};

const labelMap: Record<string, string> = {
  ai_response: "AI Response",
  knowledge_lookup: "Knowledge Lookup",
  send_message: "Send Message",
  capture_input: "Capture Input",
  set_variable: "Set Variable",
  api_call: "API Call",
  human_handoff: "Human Handoff",
};

function getPreviewContent(type: NodeType, config: Record<string, unknown>): string {
  switch (type) {
    case "ai_response":
      return config.model as string || "Configure AI model";
    case "knowledge_lookup":
      return config.knowledgeBaseId ? "KB selected" : "Select knowledge base";
    case "send_message":
      return (config.message as string)?.slice(0, 50) || "Configure message";
    case "capture_input":
      return config.variable ? `Store in: ${config.variable}` : "Configure input";
    case "set_variable":
      return config.variable ? `${config.variable} = ${config.value || "..."}` : "Configure variable";
    case "api_call":
      return config.url ? `${config.method || "GET"} ${(config.url as string).slice(0, 30)}...` : "Configure API";
    case "human_handoff":
      return config.department ? `Dept: ${config.department}` : "Configure handoff";
    default:
      return "Configure node";
  }
}

interface ActionNodeProps {
  data: WorkflowNodeData;
  selected?: boolean;
  nodeType: NodeType;
}

function ActionNodeComponent({
  data,
  selected,
  nodeType,
}: ActionNodeProps) {
  const Icon = iconMap[nodeType] || MessageSquare;
  const color = colorMap[nodeType] || "#3b82f6";
  const label = data.label || labelMap[nodeType] || "Action";

  const hasMultipleOutputs = nodeType === "capture_input" || nodeType === "api_call";

  return (
    <div
      className={cn(
        "min-w-[180px] rounded-lg border-2 bg-background shadow-md transition-all",
        selected ? "ring-2 ring-offset-1" : ""
      )}
      style={{
        borderColor: selected ? color : undefined,
        ["--tw-ring-color" as string]: `${color}40`,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
      />

      <div
        className="flex items-center gap-2 px-3 py-2 rounded-t-lg"
        style={{ backgroundColor: `${color}20` }}
      >
        <div
          className="flex items-center justify-center w-6 h-6 rounded"
          style={{ backgroundColor: color }}
        >
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="font-medium text-sm">{label}</span>
      </div>

      <div className="px-3 py-2 text-xs text-muted-foreground line-clamp-2">
        {getPreviewContent(nodeType, data.config)}
      </div>

      {hasMultipleOutputs ? (
        <div className="flex justify-between px-3 pb-2 text-xs">
          <div className="relative">
            <Handle
              type="source"
              position={Position.Bottom}
              id="success"
              className="!w-3 !h-3 !bg-green-500 !border-2 !border-background !left-0 !-bottom-3"
            />
            <span className="text-green-600 font-medium">Success</span>
          </div>
          <div className="relative">
            <Handle
              type="source"
              position={Position.Bottom}
              id="error"
              className="!w-3 !h-3 !bg-red-500 !border-2 !border-background !right-0 !-bottom-3"
            />
            <span className="text-red-600 font-medium">Error</span>
          </div>
        </div>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !border-2 !border-background"
          style={{ backgroundColor: color }}
        />
      )}
    </div>
  );
}

// Common props interface for exported nodes
interface NodeComponentProps {
  data: WorkflowNodeData;
  selected?: boolean;
}

// Create individual node components
export const AIResponseNode = memo((props: NodeComponentProps) => (
  <ActionNodeComponent {...props} nodeType="ai_response" />
));
AIResponseNode.displayName = "AIResponseNode";

export const KnowledgeLookupNode = memo((props: NodeComponentProps) => (
  <ActionNodeComponent {...props} nodeType="knowledge_lookup" />
));
KnowledgeLookupNode.displayName = "KnowledgeLookupNode";

export const SendMessageNode = memo((props: NodeComponentProps) => (
  <ActionNodeComponent {...props} nodeType="send_message" />
));
SendMessageNode.displayName = "SendMessageNode";

export const CaptureInputNode = memo((props: NodeComponentProps) => (
  <ActionNodeComponent {...props} nodeType="capture_input" />
));
CaptureInputNode.displayName = "CaptureInputNode";

export const SetVariableNode = memo((props: NodeComponentProps) => (
  <ActionNodeComponent {...props} nodeType="set_variable" />
));
SetVariableNode.displayName = "SetVariableNode";

export const APICallNode = memo((props: NodeComponentProps) => (
  <ActionNodeComponent {...props} nodeType="api_call" />
));
APICallNode.displayName = "APICallNode";

export const HumanHandoffNode = memo((props: NodeComponentProps) => (
  <ActionNodeComponent {...props} nodeType="human_handoff" />
));
HumanHandoffNode.displayName = "HumanHandoffNode";
