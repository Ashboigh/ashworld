import type { Node, Edge } from "@xyflow/react";

// Node categories
export const NODE_CATEGORIES = {
  TRIGGERS: "triggers",
  AI_KNOWLEDGE: "ai_knowledge",
  LOGIC: "logic",
  ACTIONS: "actions",
  HANDOFF: "handoff",
  END: "end",
} as const;

// Node types
export const NODE_TYPES = {
  // Triggers
  START: "start",
  // AI & Knowledge
  AI_RESPONSE: "ai_response",
  KNOWLEDGE_LOOKUP: "knowledge_lookup",
  INTENT_CLASSIFIER: "intent_classifier",
  // Logic
  CONDITION: "condition",
  SWITCH: "switch",
  // Actions
  SEND_MESSAGE: "send_message",
  BUTTONS: "buttons",
  CAPTURE_INPUT: "capture_input",
  SET_VARIABLE: "set_variable",
  API_CALL: "api_call",
  INTEGRATION_ACTION: "integration_action",
  // Handoff
  HUMAN_HANDOFF: "human_handoff",
  // End
  END: "end",
} as const;

export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES];
export type NodeCategory = (typeof NODE_CATEGORIES)[keyof typeof NODE_CATEGORIES];

// Node metadata for the palette
export interface NodeMeta {
  type: NodeType;
  label: string;
  description: string;
  category: NodeCategory;
  icon: string;
  color: string;
  maxInputs: number;
  maxOutputs: number;
  defaultConfig: Record<string, unknown>;
}

export const NODE_METADATA: Record<NodeType, NodeMeta> = {
  [NODE_TYPES.START]: {
    type: NODE_TYPES.START,
    label: "Start",
    description: "Conversation entry point",
    category: NODE_CATEGORIES.TRIGGERS,
    icon: "Play",
    color: "#22c55e",
    maxInputs: 0,
    maxOutputs: 1,
    defaultConfig: {},
  },
  [NODE_TYPES.AI_RESPONSE]: {
    type: NODE_TYPES.AI_RESPONSE,
    label: "AI Response",
    description: "Generate AI response using LLM",
    category: NODE_CATEGORIES.AI_KNOWLEDGE,
    icon: "Bot",
    color: "#8b5cf6",
    maxInputs: 1,
    maxOutputs: 1,
    defaultConfig: {
      model: "gpt-4o-mini",
      systemPrompt: "",
      temperature: 0.7,
      maxTokens: 1000,
      useKnowledgeBase: false,
      knowledgeBaseId: null,
    },
  },
  [NODE_TYPES.KNOWLEDGE_LOOKUP]: {
    type: NODE_TYPES.KNOWLEDGE_LOOKUP,
    label: "Knowledge Lookup",
    description: "Search knowledge base for relevant context",
    category: NODE_CATEGORIES.AI_KNOWLEDGE,
    icon: "Search",
    color: "#8b5cf6",
    maxInputs: 1,
    maxOutputs: 1,
    defaultConfig: {
      knowledgeBaseId: null,
      query: "{{message}}",
      limit: 5,
      threshold: 0.7,
      outputVariable: "context",
    },
  },
  [NODE_TYPES.INTENT_CLASSIFIER]: {
    type: NODE_TYPES.INTENT_CLASSIFIER,
    label: "Intent Classifier",
    description: "Classify user intent into categories",
    category: NODE_CATEGORIES.AI_KNOWLEDGE,
    icon: "Brain",
    color: "#8b5cf6",
    maxInputs: 1,
    maxOutputs: 10,
    defaultConfig: {
      intents: [
        { name: "greeting", description: "User says hello or greets" },
        { name: "question", description: "User asks a question" },
        { name: "complaint", description: "User has a complaint" },
        { name: "other", description: "Anything else" },
      ],
      model: "gpt-4o-mini",
      outputVariable: "intent",
    },
  },
  [NODE_TYPES.CONDITION]: {
    type: NODE_TYPES.CONDITION,
    label: "Condition",
    description: "Branch based on a condition",
    category: NODE_CATEGORIES.LOGIC,
    icon: "GitBranch",
    color: "#f59e0b",
    maxInputs: 1,
    maxOutputs: 2,
    defaultConfig: {
      condition: "",
      variable: "",
      operator: "equals",
      value: "",
    },
  },
  [NODE_TYPES.SWITCH]: {
    type: NODE_TYPES.SWITCH,
    label: "Switch",
    description: "Branch based on multiple values",
    category: NODE_CATEGORIES.LOGIC,
    icon: "Split",
    color: "#f59e0b",
    maxInputs: 1,
    maxOutputs: 10,
    defaultConfig: {
      variable: "",
      cases: [
        { value: "", label: "Case 1" },
        { value: "", label: "Case 2" },
      ],
      defaultCase: true,
    },
  },
  [NODE_TYPES.SEND_MESSAGE]: {
    type: NODE_TYPES.SEND_MESSAGE,
    label: "Send Message",
    description: "Send a text message to user",
    category: NODE_CATEGORIES.ACTIONS,
    icon: "MessageSquare",
    color: "#3b82f6",
    maxInputs: 1,
    maxOutputs: 1,
    defaultConfig: {
      message: "",
      delay: 0,
    },
  },
  [NODE_TYPES.BUTTONS]: {
    type: NODE_TYPES.BUTTONS,
    label: "Buttons",
    description: "Show buttons for user to choose",
    category: NODE_CATEGORIES.ACTIONS,
    icon: "LayoutGrid",
    color: "#3b82f6",
    maxInputs: 1,
    maxOutputs: 10,
    defaultConfig: {
      message: "Please choose an option:",
      buttons: [
        { label: "Option 1", value: "option1" },
        { label: "Option 2", value: "option2" },
      ],
      outputVariable: "choice",
    },
  },
  [NODE_TYPES.CAPTURE_INPUT]: {
    type: NODE_TYPES.CAPTURE_INPUT,
    label: "Capture Input",
    description: "Capture and validate user input",
    category: NODE_CATEGORIES.ACTIONS,
    icon: "FormInput",
    color: "#3b82f6",
    maxInputs: 1,
    maxOutputs: 2,
    defaultConfig: {
      prompt: "",
      variable: "",
      validation: "none",
      validationPattern: "",
      errorMessage: "Invalid input, please try again.",
      maxRetries: 3,
    },
  },
  [NODE_TYPES.SET_VARIABLE]: {
    type: NODE_TYPES.SET_VARIABLE,
    label: "Set Variable",
    description: "Set or update a variable value",
    category: NODE_CATEGORIES.ACTIONS,
    icon: "Variable",
    color: "#3b82f6",
    maxInputs: 1,
    maxOutputs: 1,
    defaultConfig: {
      variable: "",
      value: "",
      expression: false,
    },
  },
  [NODE_TYPES.API_CALL]: {
    type: NODE_TYPES.API_CALL,
    label: "API Call",
    description: "Make an HTTP request to external API",
    category: NODE_CATEGORIES.ACTIONS,
    icon: "Globe",
    color: "#3b82f6",
    maxInputs: 1,
    maxOutputs: 2,
    defaultConfig: {
      method: "GET",
      url: "",
      headers: {},
      body: "",
      outputVariable: "apiResponse",
      timeout: 30000,
    },
  },
  [NODE_TYPES.INTEGRATION_ACTION]: {
    type: NODE_TYPES.INTEGRATION_ACTION,
    label: "Integration Action",
    description: "Execute CRM, Helpdesk, or other integration actions",
    category: NODE_CATEGORIES.ACTIONS,
    icon: "Plug",
    color: "#3b82f6",
    maxInputs: 1,
    maxOutputs: 2,
    defaultConfig: {
      integrationId: "",
      actionType: "crm.create_contact",
      inputs: {},
      responseVariable: "integrationResult",
      continueOnError: true,
    },
  },
  [NODE_TYPES.HUMAN_HANDOFF]: {
    type: NODE_TYPES.HUMAN_HANDOFF,
    label: "Human Handoff",
    description: "Transfer conversation to human agent",
    category: NODE_CATEGORIES.HANDOFF,
    icon: "UserCheck",
    color: "#ec4899",
    maxInputs: 1,
    maxOutputs: 1,
    defaultConfig: {
      message: "Connecting you to a human agent...",
      department: "",
      priority: "normal",
      metadata: {},
    },
  },
  [NODE_TYPES.END]: {
    type: NODE_TYPES.END,
    label: "End",
    description: "End the conversation flow",
    category: NODE_CATEGORIES.END,
    icon: "Square",
    color: "#ef4444",
    maxInputs: 1,
    maxOutputs: 0,
    defaultConfig: {
      message: "",
      closeConversation: false,
    },
  },
};

// Custom node data type
export interface WorkflowNodeData extends Record<string, unknown> {
  type: NodeType;
  label: string;
  config: Record<string, unknown>;
}

// Custom workflow node type
export type WorkflowNode = Node<WorkflowNodeData, NodeType>;

// Custom workflow edge type
export interface WorkflowEdgeData extends Record<string, unknown> {
  label?: string;
}

export type WorkflowEdge = Edge<WorkflowEdgeData>;

// Variable type
export interface WorkflowVariable {
  id: string;
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  defaultValue?: string;
  description?: string;
}

// Full workflow data structure
export interface WorkflowData {
  id: string;
  name: string;
  description?: string;
  status: "draft" | "published" | "archived";
  triggerType: "conversation_start" | "keyword" | "intent" | "api";
  isDefault: boolean;
  version: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: WorkflowVariable[];
}

// Execution context for testing
export interface ExecutionContext {
  variables: Record<string, unknown>;
  currentNodeId: string | null;
  history: Array<{
    nodeId: string;
    timestamp: number;
    input?: unknown;
    output?: unknown;
  }>;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: number;
  }>;
}
