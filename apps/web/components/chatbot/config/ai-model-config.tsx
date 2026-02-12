"use client";

import { Input, Label } from "@repo/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

interface AIModelConfigProps {
  data: {
    aiProvider: string;
    aiModel: string;
    aiTemperature: number;
    aiMaxTokens: number;
  };
  onChange: (updates: Partial<AIModelConfigProps["data"]>) => void;
  disabled?: boolean;
}

const providers = {
  openai: {
    name: "OpenAI",
    models: [
      { id: "gpt-4o", name: "GPT-4o", description: "Most capable model" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Fast and affordable" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "High performance" },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", description: "Legacy model" },
    ],
  },
  anthropic: {
    name: "Anthropic",
    models: [
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus", description: "Most capable" },
      { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet", description: "Balanced" },
      { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", description: "Fast and compact" },
    ],
  },
};

export function AIModelConfig({ data, onChange, disabled }: AIModelConfigProps) {
  const selectedProvider = providers[data.aiProvider as keyof typeof providers] || providers.openai;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">AI Model Settings</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Configure the AI model that powers your chatbot
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="aiProvider">Provider</Label>
            <Select
              value={data.aiProvider}
              onValueChange={(value) => {
                const newProvider = providers[value as keyof typeof providers];
                onChange({
                  aiProvider: value,
                  aiModel: newProvider?.models[0]?.id || "gpt-4o-mini",
                });
              }}
              disabled={disabled}
            >
              <SelectTrigger id="aiProvider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aiModel">Model</Label>
            <Select
              value={data.aiModel}
              onValueChange={(value) => onChange({ aiModel: value })}
              disabled={disabled}
            >
              <SelectTrigger id="aiModel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {selectedProvider.models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Temperature</Label>
              <p className="text-sm text-muted-foreground">
                Controls randomness. Lower = more focused, higher = more creative
              </p>
            </div>
            <span className="text-sm font-medium tabular-nums">
              {data.aiTemperature.toFixed(1)}
            </span>
          </div>
          <Slider
            value={[data.aiTemperature]}
            onValueChange={([value]) => onChange({ aiTemperature: value })}
            min={0}
            max={2}
            step={0.1}
            disabled={disabled}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Precise (0)</span>
            <span>Balanced (0.7)</span>
            <span>Creative (2)</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="aiMaxTokens">Max Tokens</Label>
          <Input
            id="aiMaxTokens"
            type="number"
            value={data.aiMaxTokens}
            onChange={(e) => onChange({ aiMaxTokens: parseInt(e.target.value) || 1000 })}
            min={100}
            max={8000}
            disabled={disabled}
          />
          <p className="text-sm text-muted-foreground">
            Maximum length of AI responses (100-8000 tokens)
          </p>
        </div>
      </div>
    </div>
  );
}
