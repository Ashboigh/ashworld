"use client";

import { Label, Input } from "@repo/ui";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BaseConfigPanel } from "./base-config-panel";
import type { WorkflowNodeData } from "@/lib/workflow";

interface KnowledgeBase {
  id: string;
  name: string;
}

interface AIResponseConfigProps {
  nodeId: string;
  nodeData: WorkflowNodeData;
  knowledgeBases: KnowledgeBase[];
  onClose: () => void;
  onUpdateConfig: (config: Record<string, unknown>) => void;
  onUpdateLabel: (label: string) => void;
}

const AI_MODELS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  { value: "claude-3-opus", label: "Claude 3 Opus" },
  { value: "claude-3-sonnet", label: "Claude 3 Sonnet" },
  { value: "claude-3-haiku", label: "Claude 3 Haiku" },
];

export function AIResponseConfig({
  nodeId,
  nodeData,
  knowledgeBases,
  onClose,
  onUpdateConfig,
  onUpdateLabel,
}: AIResponseConfigProps) {
  const config = nodeData.config as {
    model?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    useKnowledgeBase?: boolean;
    knowledgeBaseId?: string | null;
  };

  const updateField = (field: string, value: unknown) => {
    onUpdateConfig({ ...config, [field]: value });
  };

  return (
    <BaseConfigPanel
      nodeId={nodeId}
      nodeType="ai_response"
      nodeData={nodeData}
      onClose={onClose}
      onUpdateConfig={onUpdateConfig}
      onUpdateLabel={onUpdateLabel}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>AI Model</Label>
          <Select
            value={config.model || "gpt-4o-mini"}
            onValueChange={(v) => updateField("model", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_MODELS.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>System Prompt</Label>
          <Textarea
            value={config.systemPrompt || ""}
            onChange={(e) => updateField("systemPrompt", e.target.value)}
            placeholder="You are a helpful assistant..."
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Use {"{{variable}}"} to insert variables
          </p>
        </div>

        <div className="space-y-2">
          <Label>Temperature: {config.temperature ?? 0.7}</Label>
          <Slider
            value={[config.temperature ?? 0.7]}
            onValueChange={([v]) => updateField("temperature", v)}
            min={0}
            max={2}
            step={0.1}
          />
          <p className="text-xs text-muted-foreground">
            Higher = more creative, Lower = more focused
          </p>
        </div>

        <div className="space-y-2">
          <Label>Max Tokens</Label>
          <Input
            type="number"
            value={config.maxTokens || 1000}
            onChange={(e) => updateField("maxTokens", parseInt(e.target.value))}
            min={1}
            max={4096}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Use Knowledge Base</Label>
            <p className="text-xs text-muted-foreground">
              Include relevant context from KB
            </p>
          </div>
          <Switch
            checked={config.useKnowledgeBase || false}
            onCheckedChange={(v) => updateField("useKnowledgeBase", v)}
          />
        </div>

        {config.useKnowledgeBase && (
          <div className="space-y-2">
            <Label>Knowledge Base</Label>
            <Select
              value={config.knowledgeBaseId || ""}
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
        )}
      </div>
    </BaseConfigPanel>
  );
}
