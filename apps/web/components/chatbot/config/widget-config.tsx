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
import { Switch } from "@/components/ui/switch";
import { DEFAULT_WIDGET_CONFIG } from "@/lib/chatbot/types";

interface WidgetConfigProps {
  data: {
    widgetConfig: Record<string, unknown>;
  };
  onChange: (updates: Partial<WidgetConfigProps["data"]>) => void;
  disabled?: boolean;
}

export function WidgetConfig({ data, onChange, disabled }: WidgetConfigProps) {
  const config = { ...DEFAULT_WIDGET_CONFIG, ...(data.widgetConfig || {}) };

  const updateWidget = (updates: Record<string, unknown>) => {
    onChange({ widgetConfig: { ...data.widgetConfig, ...updates } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Widget Settings</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Customize the appearance of your chat widget
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,384px)]">
        <div className="space-y-6">
          <div className="grid gap-8 max-w-none">
            {/* Colors */}
            <div className="space-y-4">
            <h3 className="text-sm font-medium">Colors</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={config.primaryColor}
                  onChange={(e) => updateWidget({ primaryColor: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                  disabled={disabled}
                />
                <Input
                  value={config.primaryColor}
                  onChange={(e) => updateWidget({ primaryColor: e.target.value })}
                  placeholder="#6366f1"
                  className="flex-1"
                  disabled={disabled}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="backgroundColor">Background</Label>
              <div className="flex gap-2">
                <Input
                  id="backgroundColor"
                  type="color"
                  value={config.backgroundColor}
                  onChange={(e) => updateWidget({ backgroundColor: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                  disabled={disabled}
                />
                <Input
                  value={config.backgroundColor}
                  onChange={(e) => updateWidget({ backgroundColor: e.target.value })}
                  placeholder="#ffffff"
                  className="flex-1"
                  disabled={disabled}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Secondary</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={config.secondaryColor}
                  onChange={(e) => updateWidget({ secondaryColor: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                  disabled={disabled}
                />
                <Input
                  value={config.secondaryColor}
                  onChange={(e) => updateWidget({ secondaryColor: e.target.value })}
                  placeholder="#f3f4f6"
                  className="flex-1"
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Position */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Position</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">Corner</Label>
              <Select
                value={config.position}
                onValueChange={(value) => updateWidget({ position: value })}
                disabled={disabled}
              >
                <SelectTrigger id="position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="borderRadius">Border Radius</Label>
              <Input
                id="borderRadius"
                type="number"
                value={config.borderRadius}
                onChange={(e) => updateWidget({ borderRadius: parseInt(e.target.value) || 12 })}
                min={0}
                max={24}
                disabled={disabled}
              />
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Header</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="headerTitle">Title</Label>
              <Input
                id="headerTitle"
                value={config.headerTitle}
                onChange={(e) => updateWidget({ headerTitle: e.target.value })}
                placeholder="Chat with us"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="headerSubtitle">Subtitle</Label>
              <Input
                id="headerSubtitle"
                value={config.headerSubtitle || ""}
                onChange={(e) => updateWidget({ headerSubtitle: e.target.value })}
                placeholder="We typically reply in minutes"
                disabled={disabled}
              />
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Branding</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={config.companyName || ""}
                onChange={(e) => updateWidget({ companyName: e.target.value })}
                placeholder="Acme Inc."
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                value={config.logoUrl || ""}
                onChange={(e) => updateWidget({ logoUrl: e.target.value })}
                placeholder="https://..."
                disabled={disabled}
              />
            </div>
          </div>
        </div>

        {/* Bubble */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Chat Bubble</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bubbleIcon">Icon</Label>
              <Select
                value={config.bubbleIcon}
                onValueChange={(value) => updateWidget({ bubbleIcon: value })}
                disabled={disabled}
              >
                <SelectTrigger id="bubbleIcon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chat">Chat</SelectItem>
                  <SelectItem value="message">Message</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bubble Size: {config.bubbleSize}px</Label>
              <Slider
                value={[config.bubbleSize]}
                onValueChange={([value]) => updateWidget({ bubbleSize: value })}
                min={48}
                max={80}
                step={4}
                disabled={disabled}
              />
            </div>
          </div>
        </div>

            {/* Behavior */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Behavior</h3>
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="autoOpen">Auto-open Widget</Label>
              <p className="text-sm text-muted-foreground">
                Automatically open the chat after a delay
              </p>
            </div>
            <Switch
              id="autoOpen"
              checked={config.autoOpen}
              onCheckedChange={(checked) => updateWidget({ autoOpen: checked })}
              disabled={disabled}
            />
          </div>
          {config.autoOpen && (
            <div className="space-y-2 ml-4">
              <Label>Delay: {(config.autoOpenDelay / 1000).toFixed(1)}s</Label>
              <Slider
                value={[config.autoOpenDelay]}
                onValueChange={([value]) => updateWidget({ autoOpenDelay: value })}
                min={0}
                max={30000}
                step={1000}
                disabled={disabled}
              />
            </div>
          )}
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="showPoweredBy">Show &quot;Powered By&quot;</Label>
              <p className="text-sm text-muted-foreground">
                Display branding in the widget footer
              </p>
            </div>
            <Switch
              id="showPoweredBy"
              checked={config.showPoweredBy}
              onCheckedChange={(checked) => updateWidget({ showPoweredBy: checked })}
              disabled={disabled}
            />
          </div>
        </div>
      </div>

        </div>

        <div className="rounded-lg border border-dashed border-border/80 bg-muted/30 p-4 text-sm text-muted-foreground">
          Live preview is pinned on the right. Keep adjusting the settings to see how they apply in real time.
        </div>
      </div>
    </div>
  );
}
