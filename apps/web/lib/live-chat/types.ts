export type AgentStatus = "offline" | "available" | "busy" | "away";

export type AssignmentStrategy = "round_robin" | "load_based" | "skill_based";

export interface LiveChatEvent {
  type: string;
  payload: Record<string, unknown>;
}

export interface HumanHandoffPayload {
  conversationId: string;
  message?: string;
  priority?: number;
  tags?: string[];
  strategy?: AssignmentStrategy;
}
