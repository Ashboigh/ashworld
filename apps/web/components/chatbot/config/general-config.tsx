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

interface GeneralConfigProps {
  data: {
    name: string;
    description: string;
    status: string;
  };
  onChange: (updates: Partial<GeneralConfigProps["data"]>) => void;
  disabled?: boolean;
}

export function GeneralConfig({ data, onChange, disabled }: GeneralConfigProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">General Settings</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Basic information about your chatbot
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Customer Support Bot"
            disabled={disabled}
          />
          <p className="text-sm text-muted-foreground">
            The name of your chatbot (visible in dashboard only)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="A helpful chatbot that answers customer questions..."
            rows={3}
            disabled={disabled}
          />
          <p className="text-sm text-muted-foreground">
            Internal description to help your team understand this bot&apos;s purpose
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={data.status}
            onValueChange={(value) => onChange({ status: value })}
            disabled={disabled}
          >
            <SelectTrigger id="status" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Only active chatbots can receive messages
          </p>
        </div>
      </div>
    </div>
  );
}
