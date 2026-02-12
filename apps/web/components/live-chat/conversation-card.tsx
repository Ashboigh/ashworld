"use client";

import { useState } from "react";
import { Button, Input } from "@repo/ui";
import { cn } from "@/lib/utils";

interface ConversationCardProps {
  conversation: {
    id: string;
    sessionId: string;
    status: string;
    priority: number;
    tags: string[];
    assignedTo: { id: string; firstName: string | null; lastName: string | null } | null;
    messages: { content: string }[];
  };
  strategy: string;
  onAssign: (conversationId: string) => void;
  onQueue: (payload: { conversationId: string; priority: number; tags: string[]; message: string }) => void;
  onSelect?: (conversation: ConversationCardProps["conversation"]) => void;
  isSelected?: boolean;
  onResolve?: (conversationId: string) => void;
  onReturnToBot?: (conversationId: string) => void;
}

export function ConversationCard({
  conversation,
  strategy,
  onAssign,
  onQueue,
  onSelect,
  isSelected,
  onResolve,
  onReturnToBot,
}: ConversationCardProps) {
  const [priority, setPriority] = useState(conversation.priority);
  const [tags, setTags] = useState(conversation.tags.join(", "));
  const [note, setNote] = useState("");

  return (
    <div
      className={cn(
        "space-y-3 rounded-lg border bg-background/60 p-4 transition",
        isSelected ? "border-primary/70 shadow-lg" : "border-border"
      )}
      onClick={() => onSelect?.(conversation)}
      role="button"
      tabIndex={0}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <p>
            <strong>{conversation.sessionId}</strong>
          </p>
          <p className="rounded-full border px-2 text-xs text-muted-foreground">
            Status: {conversation.status}
          </p>
          <p className="rounded-full border px-2 text-xs text-muted-foreground">
            Strategy: {strategy}
          </p>
        </div>
        <p>Assigned to: {conversation.assignedTo ? conversation.assignedTo.firstName || "Agent" : "None"}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Priority</label>
          <Input
            type="number"
            min={0}
            value={priority}
            onChange={(event) => setPriority(Number(event.target.value))}
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Tags</label>
          <Input
            value={tags}
            placeholder="billing, escalation"
            onChange={(event) => setTags(event.target.value)}
          />
        </div>
      </div>
      <p className="text-sm">{conversation.messages[0]?.content}</p>
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider text-muted-foreground">Agent note</label>
        <Input
          value={note}
          placeholder="Leave a note for handoff"
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onAssign(conversation.id)}>
          Assign to me
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onQueue({
              conversationId: conversation.id,
              priority,
              tags: tags.split(/[\\s,]+/).map((tag) => tag.trim()).filter(Boolean),
              message: note,
            })
          }
        >
          Queue for agents
        </Button>
        {onReturnToBot && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onReturnToBot(conversation.id)}
          >
            Return to bot
          </Button>
        )}
        {onResolve && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onResolve(conversation.id)}
          >
            Resolve
          </Button>
        )}
      </div>
    </div>
  );
}
