"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, CardContent, CardHeader } from "@repo/ui";
import { Bot } from "lucide-react";
import { ChatWindow } from "@/components/chat-widget/chat-window";
import type {
  ChatMessage,
  ChatbotInfo,
  WidgetConfig,
} from "@/components/chat-widget/types";
import { DEFAULT_WIDGET_CONFIG } from "@/components/chat-widget/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchTest } from "@/components/knowledge-base/search-test";

interface WorkflowOption {
  id: string;
  name: string;
  description: string | null;
}

interface KnowledgeBaseOption {
  id: string;
  name: string;
}

interface PersonaOverrides {
  personaName?: string | null;
  personaInstructions?: string | null;
}

interface ChatbotPreviewProps {
  chatbotId: string;
  baseUrl: string;
  initialConfig?: Partial<WidgetConfig>;
  workflowId?: string | null;
  workflows?: WorkflowOption[];
  knowledgeBases?: KnowledgeBaseOption[];
  workspaceId?: string;
  personaOverrides?: PersonaOverrides;
  disabled?: boolean;
}

export function ChatbotPreview({
  chatbotId,
  baseUrl,
  initialConfig,
  workflowId,
  workflows = [],
  knowledgeBases = [],
  workspaceId,
  personaOverrides,
  disabled,
}: ChatbotPreviewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatbotInfo, setChatbotInfo] = useState<ChatbotInfo | null>(null);
  const [isWidgetOpen, setIsWidgetOpen] = useState(true);
  const [workflowSelection, setWorkflowSelection] = useState<string>(workflowId || "none");
  const [knowledgeBaseSelection, setKnowledgeBaseSelection] = useState(
    knowledgeBases[0]?.id || "none"
  );

  useEffect(() => {
    setWorkflowSelection(workflowId || "none");
  }, [workflowId]);

  useEffect(() => {
    setKnowledgeBaseSelection(knowledgeBases[0]?.id || "none");
  }, [knowledgeBases]);

  const config: WidgetConfig = useMemo(
    () => ({
      ...DEFAULT_WIDGET_CONFIG,
      ...initialConfig,
    }),
    [initialConfig]
  );

  const displayChatbot: ChatbotInfo = useMemo(
    () => ({
      name:
        chatbotInfo?.name ||
        personaOverrides?.personaName ||
        "Chatbot preview",
      personaName: personaOverrides?.personaName ?? chatbotInfo?.personaName,
      widgetConfig: config,
    }),
    [chatbotInfo, config, personaOverrides]
  );

  const hasPreviewUrl = Boolean(baseUrl);

  const selectedWorkflow = workflows.find((workflow) => workflow.id === workflowSelection);
  const selectedKnowledgeBase = knowledgeBases.find(
    (kb) => kb.id === knowledgeBaseSelection
  );

  const startConversation = useCallback(async () => {
    if (!baseUrl || !isWidgetOpen || disabled) {
      return;
    }

    setMessages([]);
    setSessionId(null);
    setConversationId(null);
    setIsLoading(true);
    setError(null);

    try {
      const startPayload: Record<string, string> = {};
      if (workflowSelection && workflowSelection !== "none") {
        startPayload.workflowId = workflowSelection;
      }
      if (knowledgeBaseSelection && knowledgeBaseSelection !== "none") {
        startPayload.knowledgeBaseId = knowledgeBaseSelection;
      }

      const response = await fetch(`${baseUrl}/api/chat/${chatbotId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(startPayload),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.error || "Failed to start preview");
      }

      const data = await response.json();
      const assistantMessages: ChatMessage[] = (data.messages ?? []).map(
        (message: ChatMessage, index: number) => ({
          ...message,
          id: `assistant-start-${index}-${Date.now()}`,
        })
      );

      setSessionId(data.sessionId ?? null);
      setConversationId(data.conversationId ?? null);
      setMessages(assistantMessages);
      setChatbotInfo(data.chatbot ?? null);
    } catch (err) {
      console.error("Chatbot preview start error", err);
      setError(err instanceof Error ? err.message : "Unable to preview chatbot");
    } finally {
      setIsLoading(false);
    }
  }, [
    baseUrl,
    chatbotId,
    isWidgetOpen,
    workflowSelection,
    knowledgeBaseSelection,
    disabled,
  ]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || !baseUrl || !sessionId || disabled) {
        return;
      }

      const userMessage: ChatMessage = {
        role: "user",
        content: trimmed,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${baseUrl}/api/chat/${chatbotId}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, message: trimmed }),
        });

        if (!response.ok) {
          const payload = await response.json();
          throw new Error(payload?.error || "Failed to send message");
        }

        const data = await response.json();
        const assistantReplies: ChatMessage[] = (data.messages ?? []).map(
          (message: ChatMessage, index: number) => ({
            ...message,
            id: `assistant-${Date.now()}-${index}`,
          })
        );

        setConversationId(data.conversationId ?? conversationId);
        setMessages((prev) => [...prev, ...assistantReplies]);
      } catch (err) {
        console.error("Chatbot preview send error", err);
        setError(err instanceof Error ? err.message : "Unable to send message");
      } finally {
        setIsLoading(false);
      }
    },
    [baseUrl, chatbotId, conversationId, sessionId, disabled]
  );

  useEffect(() => {
    if (!hasPreviewUrl) {
      return;
    }
    startConversation();
  }, [hasPreviewUrl, startConversation]);

  useEffect(() => {
    if (!hasPreviewUrl || disabled) {
      return;
    }

    setSessionId(null);
    setConversationId(null);
    startConversation();
  }, [workflowSelection, knowledgeBaseSelection, hasPreviewUrl, startConversation, disabled]);

  const previewStatus = useMemo(() => {
    if (!isWidgetOpen) {
      return "Hidden";
    }
    if (error) {
      return "Error";
    }
    if (isLoading && !messages.length) {
      return "Connecting…";
    }
    return sessionId ? "Connected" : "Ready";
  }, [error, isLoading, isWidgetOpen, messages.length, sessionId]);

  return (
    <Card className="border border-border bg-muted/10">
      <CardHeader className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Bot className="h-4 w-4" />
          Chatbot preview
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{previewStatus}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsWidgetOpen((prev) => !prev)}
          >
            {isWidgetOpen ? "Hide" : "Show"} widget
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Review the current workflow and knowledge base interactions in real time.
        </p>

        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Connected workflow & knowledge base
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Workflow</div>
              <Select
                value={workflowSelection}
                onValueChange={(value) => setWorkflowSelection(value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select workflow" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">AI only (no workflow)</SelectItem>
                  {workflows.map((workflow) => (
                    <SelectItem key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Knowledge base
              </div>
              <Select
                value={knowledgeBaseSelection}
                onValueChange={(value) => setKnowledgeBaseSelection(value)}
                disabled={!knowledgeBases.length || disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select knowledge base" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {knowledgeBases.map((kb) => (
                    <SelectItem key={kb.id} value={kb.id}>
                      {kb.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {selectedWorkflow?.description && (
            <p className="text-xs text-muted-foreground">
              {selectedWorkflow.description}
            </p>
          )}
        </div>

        {workspaceId && (
          <div
            className={`rounded-lg border border-border/80 bg-background/50 p-4 space-y-2 ${
              disabled ? "opacity-60 pointer-events-none" : ""
            }`}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Knowledge base tester</span>
              <span className="font-semibold text-muted-foreground">
                {selectedKnowledgeBase ? selectedKnowledgeBase.name : "No KB selected"}
              </span>
            </div>
            {selectedKnowledgeBase ? (
              <SearchTest workspaceId={workspaceId} kbId={selectedKnowledgeBase.id} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Choose a knowledge base above to run a quick search from the preview.
              </p>
            )}
          </div>
        )}

        {hasPreviewUrl ? (
          <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
            {isWidgetOpen ? (
              <ChatWindow
                config={config}
                chatbot={displayChatbot}
                messages={messages}
                isLoading={isLoading}
                onSendMessage={handleSendMessage}
                onClose={() => setIsWidgetOpen(false)}
                error={error}
                embedded
                style={{ margin: "0 auto", width: 360, height: 500 }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-xs text-muted-foreground">
                <p>The widget is hidden. Click “Show widget” to open it.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/80 bg-muted/30 p-4 text-sm text-muted-foreground">
            Unable to determine the app URL for the preview. Set{" "}
            <code className="rounded bg-background px-1 py-0.5 text-xs">NEXT_PUBLIC_API_BASE_URL</code>{" "}
            or open this page from the running application to enable the chat preview.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
