"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  User,
  Clock,
  MessageSquare,
  Hand,
  X,
} from "lucide-react";
import { Button, Input } from "@repo/ui";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageList } from "./message-list";

interface Message {
  id: string;
  role: string;
  content: string;
  nodeId: string | null;
  aiModel: string | null;
  tokenCount: number | null;
  latencyMs: number | null;
  feedbackRating: number | null;
  feedbackText: string | null;
  createdAt: string;
}

interface Conversation {
  id: string;
  chatbotId: string;
  sessionId: string;
  status: string;
  context: Record<string, unknown>;
  metadata: Record<string, unknown>;
  lastMessageAt: string | null;
  closedAt: string | null;
  createdAt: string;
  priority: number;
  tags: string[];
  firstResponseTimeMs: number | null;
  assignedTo: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  chatbot: {
    id: string;
    name: string;
    workspaceId: string;
  };
  messages: Message[];
}

interface ConversationDetailProps {
  conversation: Conversation;
  orgSlug: string;
  canManage: boolean;
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  waiting_for_human: "bg-yellow-100 text-yellow-800",
  handed_off: "bg-blue-100 text-blue-800",
  closed: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  waiting_for_human: "Waiting for Human",
  handed_off: "Handed Off",
  closed: "Closed",
};

export function ConversationDetail({
  conversation,
  orgSlug: _orgSlug,
  canManage,
}: ConversationDetailProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(conversation.messages);
  const [status, setStatus] = useState(conversation.status);
  const [priority, setPriority] = useState(conversation.priority ?? 0);
  const [tags, setTags] = useState((conversation.tags ?? []).join(", "));
  const [handoffNote, setHandoffNote] = useState("");
  const [isSavingAttributes, setIsSavingAttributes] = useState(false);
  const [isQueueing, setIsQueueing] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [isTakingOver, setIsTakingOver] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [_isSending, _setIsSending] = useState(false);

  const tagList = useMemo(
    () =>
      tags
        .split(/[\s,]+/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    [tags]
  );

  const metadataEntries = useMemo(() => {
    return Object.entries(conversation.metadata ?? {}).map(([key, value]) => {
      let stringValue = "";
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        stringValue = value.toString();
      } else if (value instanceof Date) {
        stringValue = value.toISOString();
      } else if (value) {
        stringValue = JSON.stringify(value);
      }
      return { key, value: stringValue };
    });
  }, [conversation.metadata]);

  const assignedLabel = conversation.assignedTo
    ? `${conversation.assignedTo.firstName || ""} ${conversation.assignedTo.lastName || ""}`.trim()
    : "Awaiting assignment";

  useEffect(() => {
    const events = new EventSource(
      `/api/live-chat/conversations/${conversation.id}/events`
    );

    events.onmessage = (event: MessageEvent) => {
      if (!event.data || event.data.trim() === "") {
        return;
      }
      try {
        const detail = JSON.parse(event.data) as {
          type: string;
          payload?: Record<string, unknown>;
        };
        if (detail.type === "conversation.message" && detail.payload?.message) {
          const nextMessage = detail.payload.message as Message;
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === nextMessage.id)) {
              return prev;
            }
            return [...prev, nextMessage];
          });
        }
        if (detail.type === "conversation.status" && detail.payload?.status) {
          const nextStatus = detail.payload.status as string;
          setStatus((prevStatus) => {
            if (nextStatus !== prevStatus) {
              if (["waiting_for_human", "handed_off"].includes(nextStatus)) {
                toast.success("Conversation moved to the human queue");
              } else if (nextStatus === "active") {
                toast.success("Conversation returned to the bot");
              }
              return nextStatus;
            }
            return prevStatus;
          });
          if (typeof detail.payload.priority === "number") {
            setPriority(detail.payload.priority as number);
          }
        }
      } catch (error) {
        console.warn("Unable to parse live chat event", error);
      }
    };

    events.onerror = () => {
      events.close();
    };

    return () => events.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  const handleTakeover = async () => {
    setIsTakingOver(true);
    try {
      const response = await fetch(
        `/api/workspaces/${conversation.chatbot.workspaceId}/chatbots/${conversation.chatbotId}/conversations/${conversation.id}/takeover`,
        { method: "POST" }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to take over conversation");
      }

      toast.success("You have taken over this conversation");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to take over"
      );
    } finally {
      setIsTakingOver(false);
    }
  };

  const handleClose = async () => {
    setIsClosing(true);
    try {
      const response = await fetch(
        `/api/workspaces/${conversation.chatbot.workspaceId}/chatbots/${conversation.chatbotId}/conversations/${conversation.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "closed" }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to close conversation");
      }

      toast.success("Conversation closed");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to close conversation"
      );
    } finally {
      setIsClosing(false);
    }
  };

  const handleQueueForHuman = async () => {
    setIsQueueing(true);
    try {
      const response = await fetch("/api/live-chat/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
          priority,
          tags: tagList,
          message: handoffNote,
          strategy: "round_robin",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to queue human handoff");
      }

      toast.success("Conversation queued for handoff");
      setHandoffNote("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to queue handoff"
      );
    } finally {
      setIsQueueing(false);
    }
  };

  const handleReturnToBot = async () => {
    setIsReturning(true);
    try {
      const response = await fetch(`/api/live-chat/conversations/${conversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to return to bot");
      }

      setStatus("active");
      toast.success("Conversation returned to the bot");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to return to bot"
      );
    } finally {
      setIsReturning(false);
    }
  };

  const handleSaveAttributes = async () => {
    setIsSavingAttributes(true);
    try {
      const payload = {
        priority,
        tags: tagList,
      };

      const response = await fetch(`/api/live-chat/conversations/${conversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update conversation");
      }

      const normalized = tagList.join(", ");
      setTags(normalized);
      toast.success("Conversation metadata saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save metadata"
      );
    } finally {
      setIsSavingAttributes(false);
    }
  };

  const isQueued = status === "waiting_for_human" || status === "handed_off";
  const canQueue = canManage && !isQueued;
  const firstResponseLabel = conversation.firstResponseTimeMs
    ? `${conversation.firstResponseTimeMs} ms`
    : "Not recorded";

  return (
    <div className="grid h-full gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col overflow-hidden rounded-lg border bg-background shadow-sm">
        <div className="border-b px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      Session {conversation.sessionId.slice(0, 12)}...
                    </span>
                    <Badge className={statusColors[status] || statusColors.active}>
                      {statusLabels[status] || status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    via {conversation.chatbot.name}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canManage && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReturnToBot}
                    disabled={status === "active" || isReturning}
                  >
                    {isReturning ? "Returning..." : "Return to bot"}
                  </Button>
                  {!["handed_off", "waiting_for_human"].includes(status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTakeover}
                      disabled={isTakingOver}
                    >
                      <Hand className="w-4 h-4 mr-2" />
                      {isTakingOver ? "Taking over..." : "Take over"}
                    </Button>
                  )}
                </>
              )}
              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  disabled={isClosing}
                >
                  <X className="w-4 h-4 mr-2" />
                  {isClosing ? "Closing..." : "Close"}
                </Button>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              {messages.length} messages
            </div>
            {conversation.lastMessageAt && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Last message{" "}
                {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                  addSuffix: true,
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <MessageList messages={messages} />
        </div>

        <div className="border-t px-4 py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Internal note for agents
            </label>
            <Textarea
              value={handoffNote}
              onChange={(event) => setHandoffNote(event.target.value)}
              rows={3}
              placeholder="Explain why this conversation needs a human..."
              disabled={!canManage}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleQueueForHuman}
              disabled={!canQueue || isQueueing}
            >
              {isQueueing ? "Queueing…" : "Send to human queue"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setHandoffNote("")}
              disabled={!handoffNote}
            >
              Clear note
            </Button>
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-lg border bg-background p-4 space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Conversation properties
          </p>
          <div className="space-y-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                Priority
              </p>
              <Input
                type="number"
                min={0}
                value={priority}
                onChange={(event) => setPriority(Number(event.target.value))}
              />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                Tags
              </p>
              <Input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="billing, escalation"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSaveAttributes}
                disabled={isSavingAttributes}
              >
                {isSavingAttributes ? "Saving…" : "Save settings"}
              </Button>
              <span className="text-xs text-muted-foreground">
                Assigned to: {assignedLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-background p-4 space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Customer info
          </p>
          {metadataEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No metadata provided.
            </p>
          ) : (
            metadataEntries.map((entry) => (
              <div key={entry.key} className="text-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {entry.key}
                </p>
                <p className="truncate">{entry.value || "—"}</p>
              </div>
            ))
          )}
        </div>

        <div className="rounded-lg border bg-background p-4 space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Metrics
          </p>
          <div className="grid gap-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Messages</span>
              <span>{messages.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>First response</span>
              <span>{firstResponseLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Status</span>
              <Badge className={statusColors[status] || statusColors.active}>
                {statusLabels[status] || status}
              </Badge>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
