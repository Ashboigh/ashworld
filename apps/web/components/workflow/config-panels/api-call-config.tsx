"use client";

import { Plus, Trash2 } from "lucide-react";
import { Label, Input, Button } from "@repo/ui";
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

interface APICallConfigProps {
  nodeId: string;
  nodeData: WorkflowNodeData;
  onClose: () => void;
  onUpdateConfig: (config: Record<string, unknown>) => void;
  onUpdateLabel: (label: string) => void;
}

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export function APICallConfig({
  nodeId,
  nodeData,
  onClose,
  onUpdateConfig,
  onUpdateLabel,
}: APICallConfigProps) {
  const config = nodeData.config as {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: string;
    outputVariable?: string;
    timeout?: number;
  };

  const headers = config.headers || {};
  const headerEntries = Object.entries(headers);

  const updateField = (field: string, value: unknown) => {
    onUpdateConfig({ ...config, [field]: value });
  };

  const addHeader = () => {
    const newHeaders = { ...headers, "": "" };
    updateField("headers", newHeaders);
  };

  const updateHeader = (oldKey: string, newKey: string, value: string) => {
    const newHeaders: Record<string, string> = {};
    Object.entries(headers).forEach(([k, v]) => {
      if (k === oldKey) {
        if (newKey) newHeaders[newKey] = value;
      } else {
        newHeaders[k] = v;
      }
    });
    if (!Object.hasOwn(headers, oldKey)) {
      newHeaders[newKey] = value;
    }
    updateField("headers", newHeaders);
  };

  const removeHeader = (key: string) => {
    const newHeaders = { ...headers };
    delete newHeaders[key];
    updateField("headers", newHeaders);
  };

  return (
    <BaseConfigPanel
      nodeId={nodeId}
      nodeType="api_call"
      nodeData={nodeData}
      onClose={onClose}
      onUpdateConfig={onUpdateConfig}
      onUpdateLabel={onUpdateLabel}
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="w-24">
            <Label>Method</Label>
            <Select
              value={config.method || "GET"}
              onValueChange={(v) => updateField("method", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HTTP_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label>URL</Label>
            <Input
              value={config.url || ""}
              onChange={(e) => updateField("url", e.target.value)}
              placeholder="https://api.example.com/endpoint"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Use {"{{variable}}"} to insert variable values in URL
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Headers</Label>
            <Button type="button" variant="outline" size="sm" onClick={addHeader}>
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {headerEntries.map(([key, value], index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={key}
                  onChange={(e) => updateHeader(key, e.target.value, value)}
                  placeholder="Header name"
                  className="flex-1 h-8 text-sm"
                />
                <Input
                  value={value}
                  onChange={(e) => updateHeader(key, key, e.target.value)}
                  placeholder="Value"
                  className="flex-1 h-8 text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeHeader(key)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {["POST", "PUT", "PATCH"].includes(config.method || "GET") && (
          <div className="space-y-2">
            <Label>Request Body (JSON)</Label>
            <Textarea
              value={config.body || ""}
              onChange={(e) => updateField("body", e.target.value)}
              placeholder='{"key": "{{variable}}"}'
              rows={4}
              className="font-mono text-sm"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Store Response In</Label>
          <Input
            value={config.outputVariable || "apiResponse"}
            onChange={(e) => updateField("outputVariable", e.target.value)}
            placeholder="apiResponse"
          />
        </div>

        <div className="space-y-2">
          <Label>Timeout (ms)</Label>
          <Input
            type="number"
            value={config.timeout || 30000}
            onChange={(e) => updateField("timeout", parseInt(e.target.value))}
            min={1000}
            max={120000}
            step={1000}
          />
        </div>
      </div>
    </BaseConfigPanel>
  );
}
