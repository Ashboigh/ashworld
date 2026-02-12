"use client";

import { Label, Input } from "@repo/ui";
import { Textarea } from "@/components/ui/textarea";
import { BaseConfigPanel } from "./base-config-panel";
import type { WorkflowNodeData, WorkflowVariable } from "@/lib/workflow";

interface SendMessageConfigProps {
  nodeId: string;
  nodeData: WorkflowNodeData;
  variables: WorkflowVariable[];
  onClose: () => void;
  onUpdateConfig: (config: Record<string, unknown>) => void;
  onUpdateLabel: (label: string) => void;
}

export function SendMessageConfig({
  nodeId,
  nodeData,
  variables,
  onClose,
  onUpdateConfig,
  onUpdateLabel,
}: SendMessageConfigProps) {
  const config = nodeData.config as {
    message?: string;
    delay?: number;
  };

  const updateField = (field: string, value: unknown) => {
    onUpdateConfig({ ...config, [field]: value });
  };

  return (
    <BaseConfigPanel
      nodeId={nodeId}
      nodeType="send_message"
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
            placeholder="Type your message here..."
            rows={6}
          />
          <p className="text-xs text-muted-foreground">
            Use {"{{variable}}"} to insert variable values
          </p>
        </div>

        <div className="space-y-2">
          <Label>Typing Delay (ms)</Label>
          <Input
            type="number"
            value={config.delay || 0}
            onChange={(e) => updateField("delay", parseInt(e.target.value))}
            min={0}
            max={10000}
            step={100}
          />
          <p className="text-xs text-muted-foreground">
            Simulate typing delay before showing message
          </p>
        </div>

        {variables.length > 0 && (
          <div className="space-y-2">
            <Label>Available Variables</Label>
            <div className="flex flex-wrap gap-1">
              {["message", "intent", "context", ...variables.map((v) => v.name)].map(
                (varName) => (
                  <button
                    key={varName}
                    type="button"
                    className="px-2 py-0.5 text-xs bg-muted rounded hover:bg-muted/80"
                    onClick={() =>
                      updateField("message", `${config.message || ""}{{${varName}}}`)
                    }
                  >
                    {`{{${varName}}}`}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </BaseConfigPanel>
  );
}
