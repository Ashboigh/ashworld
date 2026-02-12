"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, Input } from "@repo/ui";
import type { ChannelType } from "@/lib/chatbot/types";
import {
  CHANNEL_PROVIDER_METADATA,
  CHANNEL_METADATA_BY_TYPE,
} from "@/lib/channels/metadata";

interface ChannelSummary {
  id: string;
  name: string;
  type: ChannelType;
  status: string;
  webhookUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ChannelManagementPanelProps {
  workspaceId: string;
  chatbotId: string;
  channels: ChannelSummary[];
}

export function ChannelManagementPanel({
  workspaceId,
  chatbotId,
  channels: initialChannels,
}: ChannelManagementPanelProps) {
  const [channels, setChannels] = useState(initialChannels);
  const [selectedType, setSelectedType] = useState<ChannelType>("web");
  const [channelName, setChannelName] = useState("");
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [credValues, setCredValues] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);

  const providerMetadata = useMemo(
    () => CHANNEL_METADATA_BY_TYPE[selectedType],
    [selectedType]
  );

  const resetForm = () => {
    setChannelName("");
    setConfigValues({});
    setCredValues({});
  };

  const handleFieldChange = (
    setter: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    field: string,
    value: string
  ) => {
    setter((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!channelName.trim()) {
      toast.error("Give the channel a name");
      return;
    }
    setIsCreating(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/chatbots/${chatbotId}/channels`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: channelName.trim(),
            type: selectedType,
            config: configValues,
            credentials: credValues,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create channel");
      }

      setChannels((prev) => [data.channel, ...prev]);
      toast.success(data.message || "Channel created");
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Creation failed");
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusToggle = async (channelId: string, nextStatus: string) => {
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/chatbots/${chatbotId}/channels/${channelId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update channel");
      }

      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId ? { ...channel, status: data.channel.status } : channel
        )
      );

      toast.success("Channel status updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  };

  const handleConnectionTest = async (channelId: string) => {
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/chatbots/${chatbotId}/channels/${channelId}/test`,
        { method: "POST" }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Test failed");
      }

      toast.success(data.message || "Connection test passed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Test failed");
    }
  };

  const providerOptions = CHANNEL_PROVIDER_METADATA.map((provider) => ({
    value: provider.type,
    label: provider.displayName,
    description: provider.description,
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-background p-6 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Add channel
            </p>
            <h2 className="text-xl font-semibold">Multi-channel deployment</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            Build once, deliver everywhere
          </span>
        </header>

        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Channel type
            </label>
            <select
              value={selectedType}
              onChange={(event) =>
                setSelectedType(event.target.value as ChannelType)
              }
              className="mt-2 w-full rounded border px-3 py-2 text-sm"
            >
              {providerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-muted-foreground">
              {providerMetadata.description}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Channel name
              </label>
              <Input
                value={channelName}
                onChange={(event) => setChannelName(event.target.value)}
                placeholder="e.g. WhatsApp Support"
              />
            </div>

            {providerMetadata.configFields.length > 0 && (
              <div className="grid gap-3 md:grid-cols-2">
                {providerMetadata.configFields.map((field) => (
                  <div key={`config-${field.key}`}>
                    <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      {field.label}
                    </label>
                    <Input
                      placeholder={field.placeholder}
                      value={configValues[field.key] ?? ""}
                      onChange={(event) =>
                        handleFieldChange(
                          setConfigValues,
                          field.key,
                          event.target.value
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {providerMetadata.credentialFields.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Credentials
                </p>
                {providerMetadata.credentialFields.map((field) => (
                  <div key={`cred-${field.key}`}>
                    <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      {field.label}
                    </label>
                    <Input
                      placeholder={field.placeholder}
                      value={credValues[field.key] ?? ""}
                      onChange={(event) =>
                        handleFieldChange(
                          setCredValues,
                          field.key,
                          event.target.value
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create channel"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Reset form
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {channels.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            No channels configured yet. Add one to deploy across platforms.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className="rounded-lg border bg-background p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{channel.name}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-[0.3em]">
                      {channel.type}
                    </p>
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground">
                    {channel.status}
                  </div>
                </div>
                {channel.webhookUrl && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Webhook: <code className="break-all">{channel.webhookUrl}</code>
                  </p>
                )}
                <div className="mt-3 flex items-center gap-3">
                  <Button
                    size="sm"
                    variant={channel.status === "active" ? "secondary" : "outline"}
                    onClick={() =>
                      handleStatusToggle(
                        channel.id,
                        channel.status === "active" ? "inactive" : "active"
                      )
                    }
                  >
                    {channel.status === "active" ? "Disable" : "Enable"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleConnectionTest(channel.id)}>
                    Test connection
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
