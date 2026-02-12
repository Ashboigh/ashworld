"use client";

import { X } from "lucide-react";
import { Button, Input, Label } from "@repo/ui";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NODE_METADATA,
  type NodeType,
  type WorkflowNode,
  type WorkflowVariable,
} from "@/lib/workflow";
import {
  AIResponseConfig,
  ConditionConfig,
  SendMessageConfig,
  ButtonsConfig,
  CaptureInputConfig,
  APICallConfig,
} from "./config-panels";

interface KnowledgeBase {
  id: string;
  name: string;
}

interface NodeConfigPanelProps {
  node: WorkflowNode | null;
  variables: WorkflowVariable[];
  knowledgeBases: KnowledgeBase[];
  onClose: () => void;
  onUpdateNode: (nodeId: string, updates: Partial<WorkflowNode>) => void;
}

export function NodeConfigPanel({
  node,
  variables,
  knowledgeBases,
  onClose,
  onUpdateNode,
}: NodeConfigPanelProps) {
  if (!node) {
    return (
      <div className="w-80 border-l bg-muted/30 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Select a node to configure</p>
      </div>
    );
  }

  const nodeType = node.type as NodeType;
  const nodeData = node.data;

  const handleUpdateConfig = (config: Record<string, unknown>) => {
    onUpdateNode(node.id, {
      data: { ...nodeData, config },
    });
  };

  const handleUpdateLabel = (label: string) => {
    onUpdateNode(node.id, {
      data: { ...nodeData, label },
    });
  };

  // Render specific config panel based on node type
  switch (nodeType) {
    case "ai_response":
      return (
        <AIResponseConfig
          nodeId={node.id}
          nodeData={nodeData}
          knowledgeBases={knowledgeBases}
          onClose={onClose}
          onUpdateConfig={handleUpdateConfig}
          onUpdateLabel={handleUpdateLabel}
        />
      );

    case "condition":
      return (
        <ConditionConfig
          nodeId={node.id}
          nodeData={nodeData}
          variables={variables}
          onClose={onClose}
          onUpdateConfig={handleUpdateConfig}
          onUpdateLabel={handleUpdateLabel}
        />
      );

    case "send_message":
      return (
        <SendMessageConfig
          nodeId={node.id}
          nodeData={nodeData}
          variables={variables}
          onClose={onClose}
          onUpdateConfig={handleUpdateConfig}
          onUpdateLabel={handleUpdateLabel}
        />
      );

    case "buttons":
      return (
        <ButtonsConfig
          nodeId={node.id}
          nodeData={nodeData}
          variables={variables}
          onClose={onClose}
          onUpdateConfig={handleUpdateConfig}
          onUpdateLabel={handleUpdateLabel}
        />
      );

    case "capture_input":
      return (
        <CaptureInputConfig
          nodeId={node.id}
          nodeData={nodeData}
          onClose={onClose}
          onUpdateConfig={handleUpdateConfig}
          onUpdateLabel={handleUpdateLabel}
        />
      );

    case "api_call":
      return (
        <APICallConfig
          nodeId={node.id}
          nodeData={nodeData}
          onClose={onClose}
          onUpdateConfig={handleUpdateConfig}
          onUpdateLabel={handleUpdateLabel}
        />
      );

    // Default panel for nodes that don't need complex config
    default:
      return (
        <DefaultConfigPanel
          node={node}
          nodeType={nodeType}
          variables={variables}
          knowledgeBases={knowledgeBases}
          onClose={onClose}
          onUpdateConfig={handleUpdateConfig}
          onUpdateLabel={handleUpdateLabel}
        />
      );
  }
}

// Default config panel for simpler nodes
function DefaultConfigPanel({
  node,
  nodeType,
  variables,
  knowledgeBases,
  onClose,
  onUpdateConfig,
  onUpdateLabel,
}: {
  node: WorkflowNode;
  nodeType: NodeType;
  variables: WorkflowVariable[];
  knowledgeBases: KnowledgeBase[];
  onClose: () => void;
  onUpdateConfig: (config: Record<string, unknown>) => void;
  onUpdateLabel: (label: string) => void;
}) {
  const meta = NODE_METADATA[nodeType];
  const nodeData = node.data;
  const config = nodeData.config;

  const updateField = (field: string, value: unknown) => {
    onUpdateConfig({ ...config, [field]: value });
  };

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
          Node ID: {node.id}
        </div>

        {/* Knowledge Lookup specific config */}
        {nodeType === "knowledge_lookup" && (
          <>
            <div className="space-y-2">
              <Label>Knowledge Base</Label>
              <Select
                value={(config.knowledgeBaseId as string) || ""}
                onValueChange={(v) => updateField("knowledgeBaseId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a knowledge base" />
                </SelectTrigger>
                <SelectContent>
                  {knowledgeBases.map((kb) => (
                    <SelectItem key={kb.id} value={kb.id}>
                      {kb.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Query</Label>
              <Input
                value={(config.query as string) || "{{message}}"}
                onChange={(e) => updateField("query", e.target.value)}
                placeholder="{{message}}"
              />
            </div>
            <div className="space-y-2">
              <Label>Results Limit</Label>
              <Input
                type="number"
                value={(config.limit as number) || 5}
                onChange={(e) => updateField("limit", parseInt(e.target.value))}
                min={1}
                max={20}
              />
            </div>
            <div className="space-y-2">
              <Label>Store In Variable</Label>
              <Input
                value={(config.outputVariable as string) || "context"}
                onChange={(e) => updateField("outputVariable", e.target.value)}
              />
            </div>
          </>
        )}

        {/* Set Variable specific config */}
        {nodeType === "set_variable" && (
          <>
            <div className="space-y-2">
              <Label>Variable Name</Label>
              <Input
                value={(config.variable as string) || ""}
                onChange={(e) => updateField("variable", e.target.value)}
                placeholder="myVariable"
              />
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Textarea
                value={(config.value as string) || ""}
                onChange={(e) => updateField("value", e.target.value)}
                placeholder="Value or {{otherVariable}}"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Use Expression</Label>
              <Switch
                checked={(config.expression as boolean) || false}
                onCheckedChange={(v) => updateField("expression", v)}
              />
            </div>
          </>
        )}

        {/* Human Handoff specific config */}
        {nodeType === "human_handoff" && (
          <>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={(config.message as string) || ""}
                onChange={(e) => updateField("message", e.target.value)}
                placeholder="Connecting you to an agent..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input
                value={(config.department as string) || ""}
                onChange={(e) => updateField("department", e.target.value)}
                placeholder="Support"
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={(config.priority as string) || "normal"}
                onValueChange={(v) => updateField("priority", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* End node specific config */}
        {nodeType === "end" && (
          <>
            <div className="space-y-2">
              <Label>Final Message (optional)</Label>
              <Textarea
                value={(config.message as string) || ""}
                onChange={(e) => updateField("message", e.target.value)}
                placeholder="Thank you for chatting with us!"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Close Conversation</Label>
                <p className="text-xs text-muted-foreground">
                  Mark conversation as resolved
                </p>
              </div>
              <Switch
                checked={(config.closeConversation as boolean) || false}
                onCheckedChange={(v) => updateField("closeConversation", v)}
              />
            </div>
          </>
        )}

        {/* Start node - minimal config */}
        {nodeType === "start" && (
          <p className="text-sm text-muted-foreground">
            This node marks the beginning of the conversation flow. It has no
            configurable options.
          </p>
        )}

        {/* Intent Classifier specific config */}
        {nodeType === "intent_classifier" && (
          <>
            <div className="space-y-2">
              <Label>AI Model</Label>
              <Select
                value={(config.model as string) || "gpt-4o-mini"}
                onValueChange={(v) => updateField("model", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Store Intent In</Label>
              <Input
                value={(config.outputVariable as string) || "intent"}
                onChange={(e) => updateField("outputVariable", e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Configure intents in the node&apos;s default config. Each intent
              creates a separate output.
            </p>
          </>
        )}

        {/* Switch specific config */}
        {nodeType === "switch" && (
          <>
            <div className="space-y-2">
              <Label>Variable</Label>
              <Select
                value={(config.variable as string) || ""}
                onValueChange={(v) => updateField("variable", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select variable" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="message">message</SelectItem>
                  <SelectItem value="intent">intent</SelectItem>
                  {variables.map((v) => (
                    <SelectItem key={v.id} value={v.name}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure cases in the node&apos;s default config. Each case creates
              a separate output path.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
