"use client";

import { Input, Label } from "@repo/ui";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PersonaConfigProps {
  data: {
    personaName: string;
    personaRole: string;
    personaTone: string;
    personaInstructions: string;
  };
  onChange: (updates: Partial<PersonaConfigProps["data"]>) => void;
  disabled?: boolean;
}

const tones = [
  { id: "professional", name: "Professional", description: "Formal and business-like" },
  { id: "friendly", name: "Friendly", description: "Warm and approachable" },
  { id: "casual", name: "Casual", description: "Relaxed and conversational" },
  { id: "formal", name: "Formal", description: "Highly structured and polite" },
];

export function PersonaConfig({ data, onChange, disabled }: PersonaConfigProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Persona Settings</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Define the personality and communication style of your chatbot
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="personaName">Name</Label>
            <Input
              id="personaName"
              value={data.personaName}
              onChange={(e) => onChange({ personaName: e.target.value })}
              placeholder="Alex"
              disabled={disabled}
            />
            <p className="text-sm text-muted-foreground">
              The name your chatbot will introduce itself as
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="personaTone">Tone</Label>
            <Select
              value={data.personaTone}
              onValueChange={(value) => onChange({ personaTone: value })}
              disabled={disabled}
            >
              <SelectTrigger id="personaTone">
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                {tones.map((tone) => (
                  <SelectItem key={tone.id} value={tone.id}>
                    {tone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              How the bot communicates
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="personaRole">Role / Title</Label>
          <Input
            id="personaRole"
            value={data.personaRole}
            onChange={(e) => onChange({ personaRole: e.target.value })}
            placeholder="Customer Support Specialist"
            disabled={disabled}
          />
          <p className="text-sm text-muted-foreground">
            The role or job title your chatbot represents
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="personaInstructions">Custom Instructions</Label>
          <Textarea
            id="personaInstructions"
            value={data.personaInstructions}
            onChange={(e) => onChange({ personaInstructions: e.target.value })}
            placeholder="You are a helpful customer support assistant for Acme Inc. You help customers with order inquiries, returns, and general questions about our products..."
            rows={6}
            disabled={disabled}
          />
          <p className="text-sm text-muted-foreground">
            Detailed instructions that define how the chatbot should behave and what
            knowledge it should have. This is passed to the AI model as a system prompt.
          </p>
        </div>
      </div>
    </div>
  );
}
