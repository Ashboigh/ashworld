"use client";

import { Label, Input } from "@repo/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BaseConfigPanel } from "./base-config-panel";
import type { WorkflowNodeData, WorkflowVariable } from "@/lib/workflow";

interface ConditionConfigProps {
  nodeId: string;
  nodeData: WorkflowNodeData;
  variables: WorkflowVariable[];
  onClose: () => void;
  onUpdateConfig: (config: Record<string, unknown>) => void;
  onUpdateLabel: (label: string) => void;
}

const OPERATORS = [
  { value: "equals", label: "Equals (==)" },
  { value: "not_equals", label: "Not Equals (!=)" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does Not Contain" },
  { value: "starts_with", label: "Starts With" },
  { value: "ends_with", label: "Ends With" },
  { value: "greater_than", label: "Greater Than (>)" },
  { value: "less_than", label: "Less Than (<)" },
  { value: "greater_or_equal", label: "Greater or Equal (>=)" },
  { value: "less_or_equal", label: "Less or Equal (<=)" },
  { value: "is_empty", label: "Is Empty" },
  { value: "is_not_empty", label: "Is Not Empty" },
  { value: "matches_regex", label: "Matches Regex" },
];

export function ConditionConfig({
  nodeId,
  nodeData,
  variables,
  onClose,
  onUpdateConfig,
  onUpdateLabel,
}: ConditionConfigProps) {
  const config = nodeData.config as {
    variable?: string;
    operator?: string;
    value?: string;
  };

  const updateField = (field: string, value: unknown) => {
    onUpdateConfig({ ...config, [field]: value });
  };

  const showValueField = !["is_empty", "is_not_empty"].includes(config.operator || "");

  return (
    <BaseConfigPanel
      nodeId={nodeId}
      nodeType="condition"
      nodeData={nodeData}
      onClose={onClose}
      onUpdateConfig={onUpdateConfig}
      onUpdateLabel={onUpdateLabel}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Variable</Label>
          <Select
            value={config.variable || ""}
            onValueChange={(v) => updateField("variable", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select variable" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="message">message (User Input)</SelectItem>
              <SelectItem value="intent">intent</SelectItem>
              <SelectItem value="context">context</SelectItem>
              {variables.map((v) => (
                <SelectItem key={v.id} value={v.name}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Operator</Label>
          <Select
            value={config.operator || "equals"}
            onValueChange={(v) => updateField("operator", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPERATORS.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showValueField && (
          <div className="space-y-2">
            <Label>Value</Label>
            <Input
              value={config.value || ""}
              onChange={(e) => updateField("value", e.target.value)}
              placeholder="Enter value to compare"
            />
            <p className="text-xs text-muted-foreground">
              Use {"{{variable}}"} to reference other variables
            </p>
          </div>
        )}

        <div className="p-3 bg-muted rounded-lg text-sm">
          <p className="font-medium mb-1">Preview:</p>
          <code className="text-xs">
            if ({config.variable || "variable"} {config.operator || "=="}{" "}
            {showValueField ? `"${config.value || "value"}"` : ""})
          </code>
        </div>
      </div>
    </BaseConfigPanel>
  );
}
