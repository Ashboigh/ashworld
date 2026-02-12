"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CannedResponsesPanel } from "@/components/live-chat/canned-responses-panel";
import { ConversationCard } from "@/components/live-chat/conversation-card";
import type {
  AgentStatus,
  AssignmentStrategy,
  LiveChatEvent,
} from "@/lib/live-chat/types";

interface QueueRow {
  id: string;
  sessionId: string;
  status: string;
  priority: number;
  tags: string[];
  assignedTo: { id: string; firstName: string | null; lastName: string | null } | null;
  messages: { content: string }[];
  createdAt: string;
}

interface ConversationMessageRow {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  isFromAgent?: boolean;
  agent?: { id: string; firstName: string | null; lastName: string | null; email: string | null } | null;
}

interface ConversationDetailRow {
  id: string;
  sessionId: string;
  status: string;
  priority: number;
  tags: string[];
  createdAt: string;
  assignedTo: { id: string; firstName: string | null; lastName: string | null; email: string | null } | null;
  chatbot: { id: string; name: string };
  messages: ConversationMessageRow[];
}

interface AgentRow {
  id: string;
  status: AgentStatus;
  maxConversations: number;
  currentConversations: number;
  skills: string[];
  user: { firstName: string | null; lastName: string | null; email: string | null };
}

interface QueueStats {
  waiting: number;
  handedOff: number;
  active: number;
  queued: number;
  resolved: number;
}

interface LiveChatDashboardProps {
  organizationId: string;
}

const defaultQueueStats: QueueStats = {
  waiting: 0,
  handedOff: 0,
  active: 0,
  queued: 0,
  resolved: 0,
};

const assignmentOptions: { label: string; value: AssignmentStrategy }[] = [
  { label: "Round robin", value: "round_robin" },
  { label: "Load based", value: "load_based" },
  { label: "Skill based", value: "skill_based" },
];

const assignmentDescriptions: Record<AssignmentStrategy, string> = {
  round_robin: "Rotate assignments evenly across available agents so everyone receives similar volume.",
  load_based: "Prefer agents with the most capacity so high-traffic hours stay balanced.",
  skill_based: "Try to match incoming tags to agents who tagged themselves with those skills.",
};

const playBeep = () => {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return;
  const ctx = new AudioContextClass();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 650;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.value = 0.12;
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.2);
};

const formatDuration = (ms: number) => {
  if (ms <= 0) {
    return "0s";
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};

function useLocalStorageBoolean(key: string, fallback: boolean) {
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(key);
    if (stored !== null) {
      setValue(stored === "true");
    }
  }, [key]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value ? "true" : "false");
  }, [key, value]);

  return [value, setValue] as const;
}

export function LiveChatDashboard({ organizationId }: LiveChatDashboardProps) {
  const { data: session } = useSession();
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats>(defaultQueueStats);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [currentAgent, setCurrentAgent] = useState<AgentRow | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetailRow | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [strategy, setStrategy] = useState<AssignmentStrategy>("round_robin");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<AgentStatus>("offline");
  const [maxSlots, setMaxSlots] = useState(3);
  const [isUpdatingAvailability, setIsUpdatingAvailability] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"waiting" | "handed_off" | "all">(
    "waiting"
  );
  const [soundEnabled, setSoundEnabled] = useLocalStorageBoolean("live-chat-sound", true);
  const [browserNotifications, setBrowserNotifications] = useLocalStorageBoolean(
    "live-chat-browser",
    false
  );
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useLocalStorageBoolean(
    "live-chat-email",
    true
  );
  const queueRef = useRef<HTMLDivElement | null>(null);

  const fetchConversation = useCallback(async (conversationId: string) => {
    setIsLoadingConversation(true);
    try {
      const response = await fetch(`/api/live-chat/conversations/${conversationId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load conversation");
      }
      setSelectedConversation(data.conversation ?? null);
    } catch (error) {
      console.error("Conversation load failed", error);
      toast.error(error instanceof Error ? error.message : "Failed to load conversation");
      setSelectedConversation(null);
    } finally {
      setIsLoadingConversation(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const queueRes = await fetch(`/api/live-chat/queue?orgId=${organizationId}`);
      const queueJson = await queueRes.json();
      if (queueRes.ok) {
        setQueue(queueJson.queue ?? []);
        setQueueStats(queueJson.stats ?? defaultQueueStats);
      } else {
        console.error("Live chat load failed", queueJson.error);
        setQueue([]);
        setQueueStats(defaultQueueStats);
      }
    } catch (error) {
      console.error("Live chat load failed", error);
      setQueue([]);
      setQueueStats(defaultQueueStats);
    }

    try {
      const agentsRes = await fetch(`/api/live-chat/agents?orgId=${organizationId}`);
      const agentsJson = await agentsRes.json();
      if (agentsRes.ok) {
        setAgents(agentsJson.agents ?? []);
        setCurrentAgent(agentsJson.currentAgent ?? null);
      } else {
        console.error("Agent availability load failed", agentsJson.error);
        setAgents([]);
        setCurrentAgent(null);
      }
    } catch (error) {
      console.error("Live chat agents load failed", error);
      setAgents([]);
      setCurrentAgent(null);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchData();

    const events = new EventSource(`/api/live-chat/events?orgId=${organizationId}`);

    events.onmessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as LiveChatEvent;
        if (payload.type === "conversation.waiting") {
          if (soundEnabled) {
            playBeep();
          }
          toast.success("New conversation waiting in queue");
          if (browserNotifications && Notification.permission === "granted") {
            new Notification("Live chat", {
              body: "A conversation is waiting for handoff",
            });
          }

          const parsedPayload = payload.payload as {
            conversationId?: string;
            assignedAgentId?: string | null;
          };

          if (emailAlertsEnabled && !parsedPayload.assignedAgentId) {
            fetch("/api/live-chat/notifications/email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                organizationId,
                conversationId: parsedPayload.conversationId,
              }),
            });
          }
        }
        if (payload.type === "conversation.message" || payload.type === "conversation.status") {
          toast("Realtime update received");
        }
        if (["conversation.waiting", "conversation.status", "agent.assigned"].includes(payload.type)) {
          fetchData();
        }
      } catch (error) {
        console.warn("Invalid live chat event", error);
      }
    };

    return () => events.close();
  }, [
    browserNotifications,
    emailAlertsEnabled,
    fetchData,
    organizationId,
    soundEnabled,
  ]);

  useEffect(() => {
    if (!selectedConversationId) {
      setSelectedConversation(null);
      return undefined;
    }

    fetchConversation(selectedConversationId);

    const conversationEvents = new EventSource(
      `/api/live-chat/conversations/${selectedConversationId}/events`
    );

    conversationEvents.onmessage = (event: MessageEvent) => {
      if (!event.data || event.data.trim() === "") {
        return;
      }
      try {
        const detail = JSON.parse(event.data) as LiveChatEvent;
        if (detail.type === "conversation.message") {
          const payload = detail.payload as { message?: ConversationMessageRow };
          const message = payload.message;
          if (message?.id) {
            setSelectedConversation((prev) => {
              if (!prev) return prev;
              if (prev.messages.some((m) => m.id === message.id)) {
                return prev;
              }
              return { ...prev, messages: [...prev.messages, message] };
            });
          }
        }
        if (detail.type === "conversation.status") {
          const payload = detail.payload as { status?: string };
          if (payload?.status) {
            setSelectedConversation((prev) => (prev ? { ...prev, status: payload.status ?? prev.status } : prev));
          }
        }
      } catch (error) {
        console.warn("Invalid conversation event", error);
      }
    };

    conversationEvents.onerror = () => {
      conversationEvents.close();
    };

    return () => conversationEvents.close();
  }, [fetchConversation, selectedConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation?.messages.length]);

  useEffect(() => {
    if (currentAgent) {
      setAvailabilityStatus(currentAgent.status);
      setMaxSlots(currentAgent.maxConversations);
    }
  }, [currentAgent]);

  useEffect(() => {
    if (browserNotifications && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, [browserNotifications]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  }, [fetchData]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r") {
        event.preventDefault();
        refresh();
        toast.info("Queue refreshed (Ctrl+R)");
      }
      if (event.key.toLowerCase() === "n") {
        queueRef.current?.scrollIntoView({ behavior: "smooth" });
        toast("Focused on queue (N)");
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [refresh]);

  const handleAssign = async (conversationId: string) => {
    try {
      const response = await fetch(
        `/api/live-chat/conversations/${conversationId}/assign`,
        { method: "POST" }
      );
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Failed to assign conversation");
      }
      toast.success("Conversation assigned to you");
      refresh();
      if (selectedConversationId === conversationId) {
        fetchConversation(conversationId);
      }
    } catch (error) {
      console.error("Assign failed", error);
      toast.error(error instanceof Error ? error.message : "Assign failed");
    }
  };

  const handleQueue = async (payload: {
    conversationId: string;
    priority: number;
    tags: string[];
    message: string;
  }) => {
    try {
      const response = await fetch("/api/live-chat/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          strategy,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Failed to queue human handoff");
      }
      toast.success("Conversation queued for handoff");
      refresh();
    } catch (error) {
      console.error("Handoff failed", error);
      toast.error(error instanceof Error ? error.message : "Handoff failed");
    }
  };

  const updateConversationStatus = async (conversationId: string, status: string) => {
    try {
      const response = await fetch(
        `/api/live-chat/conversations/${conversationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Failed to update conversation");
      }
      toast.success(`Conversation set to ${status.replaceAll("_", " ")}`);
      refresh();
      if (selectedConversationId === conversationId) {
        fetchConversation(conversationId);
      }
    } catch (error) {
      console.error("Status update failed", error);
      toast.error(error instanceof Error ? error.message : "Status update failed");
    }
  };

  const handleResolve = (conversationId: string) =>
    updateConversationStatus(conversationId, "closed");

  const handleReturnToBot = (conversationId: string) =>
    updateConversationStatus(conversationId, "active");

  const handleAvailabilitySave = async () => {
    setIsUpdatingAvailability(true);
    try {
      const response = await fetch("/api/live-chat/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: availabilityStatus,
          maxConversations: maxSlots,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Failed to update availability");
      }
      toast.success("Availability updated");
      await fetchData();
    } catch (error) {
      console.error("Availability update failed", error);
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setIsUpdatingAvailability(false);
    }
  };

  const filteredQueue = useMemo(() => {
    if (statusFilter === "all") {
      return queue;
    }
    const statusMap: Record<"waiting" | "handed_off", string> = {
      waiting: "waiting_for_human",
      handed_off: "handed_off",
    };
    return queue.filter(
      (conversation) => conversation.status === statusMap[statusFilter]
    );
  }, [queue, statusFilter]);

  const averageWaitMs =
    filteredQueue.length === 0
      ? 0
      : filteredQueue.reduce((sum, conversation) => {
          const created = new Date(conversation.createdAt).getTime();
          return sum + (Date.now() - created);
        }, 0) / filteredQueue.length;

  const availabilityMetrics = useMemo(() => {
    const activeAgents = agents.filter((agent) => agent.status === "available").length;
    const totalSlots = agents.reduce(
      (acc, agent) => acc + agent.maxConversations,
      0
    );
    const occupied = agents.reduce(
      (acc, agent) => acc + agent.currentConversations,
      0
    );
    return {
      activeAgents,
      seatsAvailable: Math.max(0, totalSlots - occupied),
      loadRatio:
        totalSlots === 0 ? 0 : Math.round((occupied / Math.max(totalSlots, 1)) * 100),
    };
  }, [agents]);

  const notificationOptions = [
    {
      label: "Sound alerts",
      description: "Play a tone when new conversations land in queue.",
      enabled: soundEnabled,
      toggle: () => setSoundEnabled((prev) => !prev),
    },
    {
      label: "Browser notifications",
      description: "Show a desktop notification for waiting conversations.",
      enabled: browserNotifications,
      toggle: () => setBrowserNotifications((prev) => !prev),
    },
    {
      label: "Email alerts",
      description: "Send an offline email when no agent is assigned yet.",
      enabled: emailAlertsEnabled,
      toggle: () => setEmailAlertsEnabled((prev) => !prev),
    },
  ];

  const queueSummary = [
    {
      label: "Waiting",
      value: queueStats.waiting,
      description: "Customers awaiting a handoff",
    },
    {
      label: "Handed off",
      value: queueStats.handedOff,
      description: "Assigned to humans",
    },
    {
      label: "Active bots",
      value: queueStats.active,
      description: "Handled by AI workflows",
    },
    {
      label: "Queued",
      value: queueStats.queued,
      description: "Currently tracked sessions",
    },
    {
      label: "Resolved",
      value: queueStats.resolved,
      description: "Closed conversations",
    },
  ];

  const availableStatuses: { label: string; value: AgentStatus }[] = [
    { label: "Available", value: "available" },
    { label: "Busy", value: "busy" },
    { label: "Away", value: "away" },
    { label: "Offline", value: "offline" },
  ];

  const availabilityDisplayName =
    currentAgent?.user.firstName ||
    currentAgent?.user.lastName ||
    session?.user?.name ||
    session?.user?.email ||
    "You";

  const sendReply = async () => {
    if (!selectedConversationId || !replyDraft.trim()) {
      return;
    }

    try {
      const response = await fetch(
        `/api/live-chat/conversations/${selectedConversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: replyDraft.trim() }),
        }
      );
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Failed to send message");
      }
      setReplyDraft("");
      if (json.message?.id) {
        setSelectedConversation((prev) => {
          if (!prev) return prev;
          if (prev.messages.some((m) => m.id === json.message.id)) {
            return prev;
          }
          return { ...prev, messages: [...prev.messages, json.message] };
        });
      }
    } catch (error) {
      console.error("Send reply failed", error);
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    }
  };

  const isConversationAssignedToMe =
    !!selectedConversation &&
    !!session?.user?.id &&
    selectedConversation.assignedTo?.id === session.user.id;

  const selectedConversationTitle = selectedConversation
    ? `Session ${selectedConversation.sessionId.slice(0, 12)}…`
    : "Select a conversation";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Queue health</CardTitle>
          <CardDescription>Real-time snapshot of customer demand.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {queueSummary.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-border/60 bg-muted/40 p-4 text-center"
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </p>
                <p className="text-3xl font-semibold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card ref={queueRef}>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Live chat queue</CardTitle>
                <CardDescription>
                  Filter, prioritize, and handoff conversations in real-time.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Strategy</label>
                  <select
                    value={strategy}
                    onChange={(event) =>
                      setStrategy(event.target.value as AssignmentStrategy)
                    }
                    className="rounded border px-2 py-1 text-sm"
                  >
                    {assignmentOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button onClick={refresh} disabled={isRefreshing}>
                  {isRefreshing ? "Refreshing…" : "Refresh"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {[
                  { value: "waiting", label: "Waiting" },
                  { value: "handed_off", label: "Handed off" },
                  { value: "all", label: "All queued" },
                ].map((filter) => {
                  const typedValue = filter.value as "waiting" | "handed_off" | "all";
                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setStatusFilter(typedValue)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        statusFilter === filter.value
                          ? "border border-primary bg-primary/10 text-primary"
                          : "border border-border bg-background"
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-sm text-muted-foreground">
                {assignmentDescriptions[strategy]}
              </p>
              {filteredQueue.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No conversations match the selected filter.
                </p>
              )}
              <div className="space-y-3">
                {filteredQueue.map((conversation) => (
                  <ConversationCard
                    key={conversation.id}
                    conversation={conversation}
                    strategy={strategy}
                    onAssign={handleAssign}
                    onQueue={handleQueue}
                    onSelect={() => setSelectedConversationId(conversation.id)}
                    isSelected={conversation.id === selectedConversationId}
                    onResolve={handleResolve}
                    onReturnToBot={handleReturnToBot}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your availability · {availabilityDisplayName}</CardTitle>
              <CardDescription>
                Control how the queue allocates conversations to you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Status
                </label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {availableStatuses.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setAvailabilityStatus(option.value)}
                      className={`rounded-md border px-3 py-2 text-sm text-left transition ${
                        availabilityStatus === option.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background"
                      }`}
                    >
                      <p className="font-semibold">{option.label}</p>
                      <p className="text-[11px] text-muted-foreground">Toggle status</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Max conversations
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={maxSlots}
                  onChange={(event) => setMaxSlots(Number(event.target.value))}
                  className="mt-2 w-full rounded border px-3 py-2 text-sm"
                />
              </div>
              <Button onClick={handleAvailabilitySave} disabled={isUpdatingAvailability}>
                {isUpdatingAvailability ? "Saving…" : "Save availability"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{selectedConversationTitle}</CardTitle>
              <CardDescription>
                {selectedConversation
                  ? `Status: ${selectedConversation.status.replaceAll("_", " ")} · ${selectedConversation.chatbot.name}`
                  : "Pick a conversation from the queue to start replying."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingConversation && (
                <p className="text-sm text-muted-foreground">Loading conversation…</p>
              )}

              {!isLoadingConversation && selectedConversation && (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAssign(selectedConversation.id)}
                      disabled={isConversationAssignedToMe || selectedConversation.status === "closed"}
                    >
                      {isConversationAssignedToMe ? "Assigned to you" : "Assign to me"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReturnToBot(selectedConversation.id)}
                      disabled={selectedConversation.status === "active"}
                    >
                      Return to bot
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleResolve(selectedConversation.id)}
                      disabled={selectedConversation.status === "closed"}
                    >
                      Resolve
                    </Button>
                  </div>

                  <div className="max-h-[420px] overflow-y-auto rounded-md border border-border bg-background p-3">
                    <div className="space-y-3">
                      {selectedConversation.messages.map((message) => {
                        const isUser = message.role === "user";
                        const isSystem = message.role === "system";
                        const isAgent = message.role === "assistant" && message.isFromAgent;

                        if (isSystem) {
                          return (
                            <div key={message.id} className="flex justify-center">
                              <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                                {message.content}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={message.id}
                            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[85%] space-y-1 rounded-lg px-3 py-2 text-sm ${
                                isUser
                                  ? "bg-primary text-primary-foreground"
                                  : isAgent
                                    ? "bg-secondary text-secondary-foreground"
                                    : "bg-muted"
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{message.content}</p>
                              <p className="text-[10px] opacity-75">
                                {isUser ? "Customer" : isAgent ? "Agent" : "Bot"} ·{" "}
                                {new Date(message.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Reply
                    </label>
                    <Textarea
                      value={replyDraft}
                      onChange={(event) => setReplyDraft(event.target.value)}
                      placeholder={
                        isConversationAssignedToMe
                          ? "Type your reply…"
                          : "Assign the conversation to reply"
                      }
                      disabled={!isConversationAssignedToMe}
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={sendReply}
                        disabled={!isConversationAssignedToMe || replyDraft.trim().length === 0}
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {!isLoadingConversation && !selectedConversation && (
                <p className="text-sm text-muted-foreground">
                  No conversation selected.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance metrics</CardTitle>
              <CardDescription>
                Measure how your team is handling the queue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3">
                <div className="rounded-md border border-border px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Avg wait time
                  </p>
                  <p className="text-2xl font-semibold">{formatDuration(averageWaitMs)}</p>
                  <p className="text-xs text-muted-foreground">
                    Based on filtered conversations.
                  </p>
                </div>
                <div className="rounded-md border border-border px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Agents available
                  </p>
                  <p className="text-2xl font-semibold">
                    {availabilityMetrics.activeAgents}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {availabilityMetrics.seatsAvailable} seats open • Load {availabilityMetrics.loadRatio}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Auto-assignment rules</CardTitle>
              <CardDescription>
                Switch between assignment logic depending on the moment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignmentOptions.map((option) => (
                <div
                  key={option.value}
                  className={`rounded-lg border px-4 py-3 ${
                    option.value === strategy
                      ? "border-primary/70 bg-primary/5"
                      : "border-border bg-background"
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">{option.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {assignmentDescriptions[option.value]}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={option.value === strategy ? "secondary" : "outline"}
                      onClick={() => setStrategy(option.value)}
                      disabled={option.value === strategy}
                    >
                      {option.value === strategy ? "Active" : "Use"}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Keep agents aware of new handoff requests.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {notificationOptions.map((option) => (
                <div key={option.label} className="flex items-start justify-between">
                  <div className="max-w-[65%]">
                    <p className="text-sm font-semibold">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                  <Switch checked={option.enabled} onCheckedChange={option.toggle} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Keyboard shortcuts</CardTitle>
              <CardDescription>Quickly refresh or jump to the queue.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Ctrl/Cmd + R</strong> • Refresh queue
              </p>
              <p>
                <strong className="text-foreground">N</strong> • Scroll to the top of the queue
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <CannedResponsesPanel organizationId={organizationId} />
    </div>
  );
}
