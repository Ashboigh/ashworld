"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, Save } from "lucide-react";
import { Button } from "@repo/ui";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { GeneralConfig } from "./config/general-config";
import { PersonaConfig } from "./config/persona-config";
import { AIModelConfig } from "./config/ai-model-config";
import { BehaviorConfig } from "./config/behavior-config";
import { WidgetConfig } from "./config/widget-config";
import { WorkflowConfig } from "./config/workflow-config";
import { ChatbotPreview } from "./chatbot-preview";
import { EmbedCodeDialog } from "./embed-code-dialog";

interface ChatbotData {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: string;
  personaName: string | null;
  personaRole: string | null;
  personaTone: string | null;
  personaInstructions: string | null;
  aiProvider: string;
  aiModel: string;
  aiTemperature: number;
  aiMaxTokens: number;
  greetingMessage: string | null;
  fallbackMessage: string | null;
  handoffMessage: string | null;
  enableTypingIndicator: boolean;
  responseDelayMs: number;
  widgetConfig: unknown;
  defaultWorkflowId: string | null;
  createdAt: string;
  updatedAt: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  _count: {
    conversations: number;
    channels: number;
  };
}

interface Workflow {
  id: string;
  name: string;
  description: string | null;
}

interface KnowledgeBase {
  id: string;
  name: string;
}

interface ChatbotSettingsTabsProps {
  chatbot: ChatbotData;
  workflows: Workflow[];
  knowledgeBases: KnowledgeBase[];
  orgSlug: string;
  canEdit: boolean;
}

const tabs = [
  { id: "general", label: "General" },
  { id: "persona", label: "Persona" },
  { id: "ai-model", label: "AI Model" },
  { id: "behavior", label: "Behavior" },
  { id: "widget", label: "Widget" },
  { id: "workflow", label: "Workflow" },
];

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  archived: "bg-red-100 text-red-800",
};

export function ChatbotSettingsTabs({
  chatbot,
  workflows,
  knowledgeBases,
  orgSlug,
  canEdit,
}: ChatbotSettingsTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: chatbot.name,
    description: chatbot.description || "",
    status: chatbot.status,
    personaName: chatbot.personaName || "",
    personaRole: chatbot.personaRole || "",
    personaTone: chatbot.personaTone || "friendly",
    personaInstructions: chatbot.personaInstructions || "",
    aiProvider: chatbot.aiProvider,
    aiModel: chatbot.aiModel,
    aiTemperature: chatbot.aiTemperature,
    aiMaxTokens: chatbot.aiMaxTokens,
    greetingMessage: chatbot.greetingMessage || "",
    fallbackMessage: chatbot.fallbackMessage || "",
    handoffMessage: chatbot.handoffMessage || "",
    enableTypingIndicator: chatbot.enableTypingIndicator,
    responseDelayMs: chatbot.responseDelayMs,
    widgetConfig: chatbot.widgetConfig as Record<string, unknown>,
    defaultWorkflowId: chatbot.defaultWorkflowId || "",
  });

  const [previewBaseUrl, setPreviewBaseUrl] = useState("");

  useEffect(() => {
    const envBase =
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_APP_URL;

    if (envBase) {
      setPreviewBaseUrl(envBase);
      return;
    }

    if (typeof window !== "undefined") {
      setPreviewBaseUrl(window.location.origin);
    }
  }, []);

  const hasPreviewUrl = Boolean(previewBaseUrl);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/workspaces/${chatbot.workspaceId}/chatbots/${chatbot.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            defaultWorkflowId: formData.defaultWorkflowId || null,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save chatbot");
      }

      toast.success("Chatbot saved successfully");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save chatbot");
    } finally {
      setIsSaving(false);
    }
  };

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/${orgSlug}/chatbots`}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{chatbot.name}</h1>
              <p className="text-sm text-muted-foreground">
                {chatbot.workspace.name}
              </p>
            </div>
          </div>
          <Badge className={statusColors[chatbot.status] || statusColors.draft}>
            {chatbot.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <EmbedCodeDialog chatbotId={chatbot.id} />
          {canEdit && (
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,420px)]">
        <div className="space-y-6">
          {activeTab === "general" && (
            <GeneralConfig
              data={formData}
              onChange={updateFormData}
              disabled={!canEdit}
            />
          )}
          {activeTab === "persona" && (
            <PersonaConfig
              data={formData}
              onChange={updateFormData}
              disabled={!canEdit}
            />
          )}
          {activeTab === "ai-model" && (
            <AIModelConfig
              data={formData}
              onChange={updateFormData}
              disabled={!canEdit}
            />
          )}
          {activeTab === "behavior" && (
            <BehaviorConfig
              data={formData}
              onChange={updateFormData}
              disabled={!canEdit}
            />
          )}
          {activeTab === "widget" && (
            <WidgetConfig
              data={formData}
              onChange={updateFormData}
              disabled={!canEdit}
            />
          )}
          {activeTab === "workflow" && (
            <WorkflowConfig
              data={formData}
              onChange={updateFormData}
              workflows={workflows}
              disabled={!canEdit}
            />
          )}
        </div>
        <div className="space-y-4 lg:sticky lg:top-24">
          {hasPreviewUrl ? (
           <ChatbotPreview
             chatbotId={chatbot.id}
             baseUrl={previewBaseUrl}
             initialConfig={formData.widgetConfig}
             workflowId={formData.defaultWorkflowId || null}
             workflows={workflows}
             knowledgeBases={knowledgeBases}
             workspaceId={chatbot.workspace.id}
             personaOverrides={{
               personaInstructions: formData.personaInstructions || undefined,
               personaName: formData.personaName || undefined,
             }}
             disabled={!canEdit}
           />
          ) : (
            <div className="rounded-lg border border-dashed border-border/80 bg-muted/30 p-4 text-sm text-muted-foreground">
              Unable to determine the app URL for the preview. Set{" "}
              <code className="rounded bg-background px-1 py-0.5 text-xs">NEXT_PUBLIC_API_BASE_URL</code>{" "}
              or open this page from the running application to enable the chat preview.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
