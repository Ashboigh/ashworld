import type { Chatbot } from "@repo/database";

// Execution context that persists throughout a conversation
export interface ExecutionContext {
  conversationId: string;
  sessionId: string;
  chatbotId: string;
  workflowId: string;

  // Current execution state
  currentNodeId: string | null;
  variables: Record<string, unknown>;

  // Conversation history
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: number;
    nodeId?: string;
  }>;

  // Execution history for debugging
  executionHistory: Array<{
    nodeId: string;
    nodeType: string;
    timestamp: number;
    input: unknown;
    output: unknown;
    duration: number;
  }>;

  // Pending state (for async operations like user input)
  awaitingInput: boolean;
  awaitingInputConfig?: {
    nodeId: string;
    type: "text" | "buttons" | "email" | "phone" | "number" | "capture_input";
    validation?: {
      pattern?: string;
      errorMessage?: string;
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      patternMessage?: string;
    };
    buttons?: Array<{ label: string; value: string }>;
    retryCount: number;
    maxRetries: number;
  };
}

// Result of executing a node or series of nodes
export interface ExecutionResult {
  response: {
    type: "message" | "buttons" | "handoff" | "end" | "input_request";
    content: string;
    buttons?: Array<{ label: string; value: string }>;
    citations?: Array<{
      content: string;
      source: string;
      score: number;
    }>;
    metadata?: Record<string, unknown>;
    inputType?: string;
  } | null;
  context: ExecutionContext;
  nodeId: string;
  shouldContinue: boolean;
  nextSourceHandle?: string; // For conditional branching
  selectedHandle?: string; // For switch/condition routing
  conversationStatus?: "active" | "waiting_for_human" | "handed_off" | "closed"; // For status updates
}

// Node handler interface - each node type implements this
export interface NodeHandler {
  execute(
    node: WorkflowNodeData,
    context: ExecutionContext,
    userMessage?: string
  ): Promise<ExecutionResult>;
}

// Workflow node data structure
export interface WorkflowNodeData {
  id: string;
  nodeId: string;
  type: string;
  positionX: number;
  positionY: number;
  config: Record<string, unknown>;
  label?: string;
}

// Workflow edge data structure
export interface WorkflowEdgeData {
  id: string;
  edgeId: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  label?: string | null;
}

// Chatbot configuration for the executor
export interface ChatbotConfig {
  id: string;
  workspaceId?: string | null;
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
}

// Helper to convert Prisma Chatbot to ChatbotConfig
export function toChatbotConfig(chatbot: Chatbot): ChatbotConfig {
  return {
    id: chatbot.id,
    personaName: chatbot.personaName,
    personaRole: chatbot.personaRole,
    personaTone: chatbot.personaTone,
    personaInstructions: chatbot.personaInstructions,
    aiProvider: chatbot.aiProvider,
    aiModel: chatbot.aiModel,
    aiTemperature: chatbot.aiTemperature,
    aiMaxTokens: chatbot.aiMaxTokens,
    greetingMessage: chatbot.greetingMessage,
    fallbackMessage: chatbot.fallbackMessage,
    handoffMessage: chatbot.handoffMessage,
    workspaceId: chatbot.workspaceId,
  };
}

// Create initial execution context
export function createInitialContext(
  conversationId: string,
  sessionId: string,
  chatbotId: string,
  workflowId: string
): ExecutionContext {
  return {
    conversationId,
    sessionId,
    chatbotId,
    workflowId,
    currentNodeId: null,
    variables: {
      session_id: sessionId,
      conversation_id: conversationId,
      timestamp: Date.now(),
    },
    messages: [],
    executionHistory: [],
    awaitingInput: false,
  };
}
