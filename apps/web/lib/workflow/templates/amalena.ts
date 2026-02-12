import { NodeType, NODE_TYPES } from "../types";
import { AMALENA_PLUGIN_TEMPLATE } from "./amalena-plugin";

export interface WorkflowTemplateNode {
  nodeId: string;
  type: NodeType;
  positionX: number;
  positionY: number;
  config: Record<string, unknown>;
}

export interface WorkflowTemplateEdge {
  edgeId: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
}

export interface WorkflowTemplateVariable {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  defaultValue?: string;
  description?: string;
}

export interface WorkflowTemplate {
  name: string;
  description: string;
  triggerType: "conversation_start" | "keyword" | "intent" | "api";
  isDefault?: boolean;
  nodes: WorkflowTemplateNode[];
  edges: WorkflowTemplateEdge[];
  variables?: WorkflowTemplateVariable[];
}

export const AMALENA_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    name: "Auto-escalate Negative Sentiment",
    description: "Detect negative sentiment and route urgent cases to the escalations team.",
    triggerType: "conversation_start",
    isDefault: true,
    nodes: [
      {
      nodeId: "start-negative",
        type: NODE_TYPES.START,
        positionX: 240,
        positionY: 60,
        config: {},
      },
      {
        nodeId: "condition-negative",
        type: NODE_TYPES.CONDITION,
        positionX: 240,
        positionY: 180,
        config: {
          variable: "sentiment.label",
          operator: "equals",
          value: "negative",
        },
      },
      {
        nodeId: "send-negative-response",
        type: NODE_TYPES.SEND_MESSAGE,
        positionX: 240,
        positionY: 300,
        config: {
          message:
            "I see that the sentiment feels negative. I'm escalating this conversation to a human specialist now.",
          delay: 0,
        },
      },
      {
        nodeId: "handoff-negative",
        type: NODE_TYPES.HUMAN_HANDOFF,
        positionX: 240,
        positionY: 380,
        config: {
          message: "Connecting you to the Escalations team for immediate support.",
          department: "Escalations",
          priority: "high",
        },
      },
      {
        nodeId: "end-negative",
        type: NODE_TYPES.END,
        positionX: 240,
        positionY: 460,
        config: {
          message: "Thanks for waiting. A human agent will join shortly.",
          closeConversation: false,
        },
      },
    ],
    edges: [
      {
        edgeId: "e-start-negative",
        source: "start-negative",
        target: "condition-negative",
      },
      {
        edgeId: "e-condition-negative-true",
        source: "condition-negative",
        target: "send-negative-response",
        sourceHandle: "true",
      },
      {
        edgeId: "e-condition-negative-false",
        source: "condition-negative",
        target: "end-negative",
        sourceHandle: "false",
      },
      {
        edgeId: "e-send-negative-handoff",
        source: "send-negative-response",
        target: "handoff-negative",
      },
      {
        edgeId: "e-handoff-negative-end",
        source: "handoff-negative",
        target: "end-negative",
      },
    ],
    variables: [
      {
        name: "sentiment.label",
        type: "string",
        defaultValue: "neutral",
        description: "Sentiment label returned by the classifier",
      },
    ],
  },
  {
    name: "Order Tracking Automation",
    description: "Respond to tracking requests by surfacing order status instantly.",
    triggerType: "intent",
    nodes: [
      {
        nodeId: "start-tracking",
        type: NODE_TYPES.START,
        positionX: 240,
        positionY: 60,
        config: {},
      },
      {
        nodeId: "condition-tracking",
        type: NODE_TYPES.CONDITION,
        positionX: 240,
        positionY: 180,
        config: {
          variable: "message",
          operator: "contains",
          value: "order",
        },
      },
      {
        nodeId: "send-tracking-response",
        type: NODE_TYPES.SEND_MESSAGE,
        positionX: 240,
        positionY: 300,
        config: {
          message:
            "I can share the latest status for your order {{orderId}}. One moment while I fetch that for you.",
          delay: 0,
        },
      },
      {
        nodeId: "end-tracking",
        type: NODE_TYPES.END,
        positionX: 240,
        positionY: 380,
        config: {
          message: "Feel free to ask another question.",
          closeConversation: false,
        },
      },
    ],
    edges: [
      {
        edgeId: "e-start-tracking",
        source: "start-tracking",
        target: "condition-tracking",
      },
      {
        edgeId: "e-condition-tracking-true",
        source: "condition-tracking",
        target: "send-tracking-response",
        sourceHandle: "true",
      },
      {
        edgeId: "e-condition-tracking-false",
        source: "condition-tracking",
        target: "end-tracking",
        sourceHandle: "false",
      },
      {
        edgeId: "e-tracking-end",
        source: "send-tracking-response",
        target: "end-tracking",
      },
    ],
    variables: [
      {
        name: "message",
        type: "string",
        description: "Incoming user message",
      },
      {
        name: "orderId",
        type: "string",
        description: "Detected order identifier",
      },
    ],
  },
  {
    name: "Business Hours Response",
    description: "Politely notify users when the team is offline and reassure them when we are available.",
    triggerType: "conversation_start",
    nodes: [
      {
        nodeId: "start-business-hours",
        type: NODE_TYPES.START,
        positionX: 260,
        positionY: 60,
        config: {},
      },
      {
        nodeId: "condition-business-hours",
        type: NODE_TYPES.CONDITION,
        positionX: 260,
        positionY: 180,
        config: {
          variable: "meta.isBusinessHours",
          operator: "equals",
          value: "false",
        },
      },
      {
        nodeId: "send-outside-hours",
        type: NODE_TYPES.SEND_MESSAGE,
        positionX: 120,
        positionY: 300,
        config: {
          message:
            "We are currently outside business hours (8 AM - 6 PM). We'll reply once we're back online.",
          delay: 0,
        },
      },
      {
        nodeId: "send-inside-hours",
        type: NODE_TYPES.SEND_MESSAGE,
        positionX: 400,
        positionY: 300,
        config: {
          message: "Our team is online and ready to assist you. How can I help today?",
          delay: 0,
        },
      },
      {
        nodeId: "end-business-hours",
        type: NODE_TYPES.END,
        positionX: 260,
        positionY: 420,
        config: {
          message: "Thank you for reaching out.",
          closeConversation: false,
        },
      },
    ],
    edges: [
      {
        edgeId: "e-start-business",
        source: "start-business-hours",
        target: "condition-business-hours",
      },
      {
        edgeId: "e-business-false",
        source: "condition-business-hours",
        target: "send-inside-hours",
        sourceHandle: "false",
      },
      {
        edgeId: "e-business-true",
        source: "condition-business-hours",
        target: "send-outside-hours",
        sourceHandle: "true",
      },
      {
        edgeId: "e-outside-end",
        source: "send-outside-hours",
        target: "end-business-hours",
      },
      {
        edgeId: "e-inside-end",
        source: "send-inside-hours",
        target: "end-business-hours",
      },
    ],
    variables: [
      {
        name: "meta.isBusinessHours",
        type: "boolean",
        defaultValue: "true",
        description: "Flag that indicates if team is in business hours",
      },
    ],
  },
  {
    name: "Refund Request Handler",
    description: "Collect order details for refund requests and handoff to Returns specialists.",
    triggerType: "intent",
    nodes: [
      {
        nodeId: "start-refund",
        type: NODE_TYPES.START,
        positionX: 260,
        positionY: 60,
        config: {},
      },
      {
        nodeId: "condition-refund",
        type: NODE_TYPES.CONDITION,
        positionX: 260,
        positionY: 180,
        config: {
          variable: "intent",
          operator: "equals",
          value: "refund",
        },
      },
      {
        nodeId: "capture-order",
        type: NODE_TYPES.CAPTURE_INPUT,
        positionX: 260,
        positionY: 300,
        config: {
          prompt: "Please provide the order number so we can start the refund.",
          variable: "orderId",
          validation: "none",
          validationPattern: "",
          errorMessage: "Enter a valid order number to continue.",
          maxRetries: 3,
        },
      },
      {
        nodeId: "send-refund-response",
        type: NODE_TYPES.SEND_MESSAGE,
        positionX: 260,
        positionY: 420,
        config: {
          message:
            "Thanks! I've captured {{orderId}} and created a refund request. I'll connect you to our Returns team now.",
          delay: 0,
        },
      },
      {
        nodeId: "handoff-refund",
        type: NODE_TYPES.HUMAN_HANDOFF,
        positionX: 260,
        positionY: 500,
        config: {
          message: "Passing you to Returns for empathy and next steps.",
          department: "Returns",
          priority: "medium",
        },
      },
      {
        nodeId: "end-refund",
        type: NODE_TYPES.END,
        positionX: 260,
        positionY: 580,
        config: {
          message: "We'll follow up shortly.",
          closeConversation: false,
        },
      },
    ],
    edges: [
      {
        edgeId: "e-start-refund",
        source: "start-refund",
        target: "condition-refund",
      },
      {
        edgeId: "e-refund-true",
        source: "condition-refund",
        target: "capture-order",
        sourceHandle: "true",
      },
      {
        edgeId: "e-refund-false",
        source: "condition-refund",
        target: "end-refund",
        sourceHandle: "false",
      },
      {
        edgeId: "e-capture-send",
        source: "capture-order",
        target: "send-refund-response",
      },
      {
        edgeId: "e-send-handoff",
        source: "send-refund-response",
        target: "handoff-refund",
      },
      {
        edgeId: "e-handoff-end",
        source: "handoff-refund",
        target: "end-refund",
      },
    ],
    variables: [
      {
        name: "intent",
        type: "string",
        description: "Intent classifier output",
      },
      {
        name: "orderId",
        type: "string",
        description: "Order identifier captured from user",
      },
    ],
  },
  AMALENA_PLUGIN_TEMPLATE,
];

export function getAmalenaWorkflowTemplates(): WorkflowTemplate[] {
  return AMALENA_WORKFLOW_TEMPLATES;
}

export { AMALENA_PLUGIN_TEMPLATE };
