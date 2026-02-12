"use client";

import { Input, Label } from "@repo/ui";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface BehaviorConfigProps {
  data: {
    greetingMessage: string;
    fallbackMessage: string;
    handoffMessage: string;
    enableTypingIndicator: boolean;
    responseDelayMs: number;
  };
  onChange: (updates: Partial<BehaviorConfigProps["data"]>) => void;
  disabled?: boolean;
}

export function BehaviorConfig({ data, onChange, disabled }: BehaviorConfigProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Behavior Settings</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Configure how your chatbot responds and behaves
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <div className="space-y-2">
          <Label htmlFor="greetingMessage">Greeting Message</Label>
          <Textarea
            id="greetingMessage"
            value={data.greetingMessage}
            onChange={(e) => onChange({ greetingMessage: e.target.value })}
            placeholder="Hello! How can I help you today?"
            rows={2}
            disabled={disabled}
          />
          <p className="text-sm text-muted-foreground">
            The first message sent when a conversation starts
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fallbackMessage">Fallback Message</Label>
          <Textarea
            id="fallbackMessage"
            value={data.fallbackMessage}
            onChange={(e) => onChange({ fallbackMessage: e.target.value })}
            placeholder="I'm sorry, I didn't understand that. Could you please rephrase your question?"
            rows={2}
            disabled={disabled}
          />
          <p className="text-sm text-muted-foreground">
            Message shown when the bot encounters an error or can&apos;t understand the user
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="handoffMessage">Handoff Message</Label>
          <Textarea
            id="handoffMessage"
            value={data.handoffMessage}
            onChange={(e) => onChange({ handoffMessage: e.target.value })}
            placeholder="I'm connecting you with a human agent. Please wait a moment..."
            rows={2}
            disabled={disabled}
          />
          <p className="text-sm text-muted-foreground">
            Message shown when transferring the conversation to a human agent
          </p>
        </div>

        <div className="flex items-center justify-between py-4 border-t">
          <div>
            <Label htmlFor="enableTypingIndicator">Typing Indicator</Label>
            <p className="text-sm text-muted-foreground">
              Show a typing animation while the bot is generating a response
            </p>
          </div>
          <Switch
            id="enableTypingIndicator"
            checked={data.enableTypingIndicator}
            onCheckedChange={(checked) => onChange({ enableTypingIndicator: checked })}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="responseDelayMs">Response Delay (ms)</Label>
          <Input
            id="responseDelayMs"
            type="number"
            value={data.responseDelayMs}
            onChange={(e) => onChange({ responseDelayMs: parseInt(e.target.value) || 0 })}
            min={0}
            max={5000}
            step={100}
            disabled={disabled}
          />
          <p className="text-sm text-muted-foreground">
            Add a delay before showing responses to feel more natural (0-5000ms)
          </p>
        </div>
      </div>
    </div>
  );
}
