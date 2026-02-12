"use client";

import { Plus, Trash2, GripVertical } from "lucide-react";
import { Label, Input, Button } from "@repo/ui";
import { Textarea } from "@/components/ui/textarea";
import { BaseConfigPanel } from "./base-config-panel";
import type { WorkflowNodeData, WorkflowVariable } from "@/lib/workflow";

interface ButtonOption {
  label: string;
  value: string;
}

interface ButtonsConfigProps {
  nodeId: string;
  nodeData: WorkflowNodeData;
  variables: WorkflowVariable[];
  onClose: () => void;
  onUpdateConfig: (config: Record<string, unknown>) => void;
  onUpdateLabel: (label: string) => void;
}

export function ButtonsConfig({
  nodeId,
  nodeData,
  variables: _variables,
  onClose,
  onUpdateConfig,
  onUpdateLabel,
}: ButtonsConfigProps) {
  const config = nodeData.config as {
    message?: string;
    buttons?: ButtonOption[];
    outputVariable?: string;
  };

  const buttons = config.buttons || [];

  const updateField = (field: string, value: unknown) => {
    onUpdateConfig({ ...config, [field]: value });
  };

  const addButton = () => {
    const newButtons = [
      ...buttons,
      { label: `Option ${buttons.length + 1}`, value: `option${buttons.length + 1}` },
    ];
    updateField("buttons", newButtons);
  };

  const removeButton = (index: number) => {
    const newButtons = buttons.filter((_, i) => i !== index);
    updateField("buttons", newButtons);
  };

  const updateButton = (index: number, field: keyof ButtonOption, value: string) => {
    const newButtons = buttons.map((btn, i) =>
      i === index ? { ...btn, [field]: value } : btn
    );
    updateField("buttons", newButtons);
  };

  return (
    <BaseConfigPanel
      nodeId={nodeId}
      nodeType="buttons"
      nodeData={nodeData}
      onClose={onClose}
      onUpdateConfig={onUpdateConfig}
      onUpdateLabel={onUpdateLabel}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea
            value={config.message || ""}
            onChange={(e) => updateField("message", e.target.value)}
            placeholder="Please select an option:"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Buttons</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addButton}
              disabled={buttons.length >= 10}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {buttons.map((btn, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input
                    value={btn.label}
                    onChange={(e) => updateButton(index, "label", e.target.value)}
                    placeholder="Button label"
                    className="h-8 text-sm"
                  />
                  <Input
                    value={btn.value}
                    onChange={(e) => updateButton(index, "value", e.target.value)}
                    placeholder="Value"
                    className="h-8 text-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeButton(index)}
                  disabled={buttons.length <= 1}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Each button creates a separate output path
          </p>
        </div>

        <div className="space-y-2">
          <Label>Store Selection In</Label>
          <Input
            value={config.outputVariable || "choice"}
            onChange={(e) => updateField("outputVariable", e.target.value)}
            placeholder="Variable name"
          />
          <p className="text-xs text-muted-foreground">
            The selected button&apos;s value will be stored in this variable
          </p>
        </div>
      </div>
    </BaseConfigPanel>
  );
}
