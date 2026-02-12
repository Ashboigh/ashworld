"use client";

import { Label, Input } from "@repo/ui";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BaseConfigPanel } from "./base-config-panel";
import type { WorkflowNodeData } from "@/lib/workflow";

interface CaptureInputConfigProps {
  nodeId: string;
  nodeData: WorkflowNodeData;
  onClose: () => void;
  onUpdateConfig: (config: Record<string, unknown>) => void;
  onUpdateLabel: (label: string) => void;
}

const VALIDATION_TYPES = [
  { value: "none", label: "None" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone Number" },
  { value: "number", label: "Number" },
  { value: "url", label: "URL" },
  { value: "date", label: "Date" },
  { value: "regex", label: "Custom Regex" },
];

export function CaptureInputConfig({
  nodeId,
  nodeData,
  onClose,
  onUpdateConfig,
  onUpdateLabel,
}: CaptureInputConfigProps) {
  const config = nodeData.config as {
    prompt?: string;
    variable?: string;
    validation?: string;
    validationPattern?: string;
    errorMessage?: string;
    maxRetries?: number;
  };

  const updateField = (field: string, value: unknown) => {
    onUpdateConfig({ ...config, [field]: value });
  };

  return (
    <BaseConfigPanel
      nodeId={nodeId}
      nodeType="capture_input"
      nodeData={nodeData}
      onClose={onClose}
      onUpdateConfig={onUpdateConfig}
      onUpdateLabel={onUpdateLabel}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Prompt Message</Label>
          <Textarea
            value={config.prompt || ""}
            onChange={(e) => updateField("prompt", e.target.value)}
            placeholder="Please enter your email address:"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Store In Variable</Label>
          <Input
            value={config.variable || ""}
            onChange={(e) => updateField("variable", e.target.value)}
            placeholder="userEmail"
          />
        </div>

        <div className="space-y-2">
          <Label>Validation Type</Label>
          <Select
            value={config.validation || "none"}
            onValueChange={(v) => updateField("validation", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VALIDATION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {config.validation === "regex" && (
          <div className="space-y-2">
            <Label>Regex Pattern</Label>
            <Input
              value={config.validationPattern || ""}
              onChange={(e) => updateField("validationPattern", e.target.value)}
              placeholder="^[A-Za-z]+$"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Error Message</Label>
          <Input
            value={config.errorMessage || ""}
            onChange={(e) => updateField("errorMessage", e.target.value)}
            placeholder="Invalid input, please try again."
          />
        </div>

        <div className="space-y-2">
          <Label>Max Retries</Label>
          <Input
            type="number"
            value={config.maxRetries || 3}
            onChange={(e) => updateField("maxRetries", parseInt(e.target.value))}
            min={1}
            max={10}
          />
          <p className="text-xs text-muted-foreground">
            After max retries, flow continues via error output
          </p>
        </div>
      </div>
    </BaseConfigPanel>
  );
}
