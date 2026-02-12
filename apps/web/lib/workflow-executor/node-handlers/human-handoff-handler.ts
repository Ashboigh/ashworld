import type {
  NodeHandler,
  WorkflowNodeData,
  ExecutionContext,
  ExecutionResult,
  ChatbotConfig,
} from "../types";
import { interpolateTemplate } from "../template-engine";

interface HumanHandoffConfig {
  message?: string;
  department?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  collectInfo?: boolean;
  requiredFields?: string[];
}

/**
 * Human handoff node handler - transfers conversation to human agent
 */
export class HumanHandoffHandler implements NodeHandler {
  private chatbotConfig: ChatbotConfig;

  constructor(chatbotConfig: ChatbotConfig) {
    this.chatbotConfig = chatbotConfig;
  }

  async execute(
    node: WorkflowNodeData,
    context: ExecutionContext,
    _userMessage?: string
  ): Promise<ExecutionResult> {
    const config = node.config as unknown as HumanHandoffConfig;

    // Use configured message or fallback to chatbot's handoff message
    let handoffMessage = config.message ||
      this.chatbotConfig.handoffMessage ||
      "I'm transferring you to a human agent who can better assist you. Please wait a moment.";

    handoffMessage = interpolateTemplate(handoffMessage, context.variables);

    // Prepare handoff metadata
    const handoffData = {
      department: config.department,
      priority: config.priority || "normal",
      conversationSummary: this.generateSummary(context),
      collectedInfo: this.collectInfo(context, config.requiredFields),
      requestedAt: new Date().toISOString(),
    };

    // Update context to indicate handoff state
    const updatedContext: ExecutionContext = {
      ...context,
      variables: {
        ...context.variables,
        "_handoffRequested": true,
        "_handoffData": handoffData,
      },
    };

    return {
      response: {
        type: "handoff",
        content: handoffMessage,
        metadata: handoffData,
      },
      context: updatedContext,
      nodeId: node.nodeId,
      shouldContinue: false, // Stop workflow execution after handoff
      conversationStatus: "waiting_for_human",
    };
  }

  private generateSummary(context: ExecutionContext): string {
    // Generate a brief summary of the conversation
    const recentMessages = context.messages.slice(-10);
    const userMessages = recentMessages
      .filter((m) => m.role === "user")
      .map((m) => m.content);

    if (userMessages.length === 0) {
      return "No conversation history available.";
    }

    // Simple summary - first and last user messages
    if (userMessages.length === 1) {
      return `User inquiry: "${userMessages[0]}"`;
    }

    return `Initial inquiry: "${userMessages[0]}"\nMost recent message: "${userMessages[userMessages.length - 1]}"`;
  }

  private collectInfo(
    context: ExecutionContext,
    requiredFields?: string[]
  ): Record<string, unknown> {
    const info: Record<string, unknown> = {};

    // Standard fields that are commonly collected
    const standardFields = [
      "name",
      "email",
      "phone",
      "company",
      "issue",
      "orderId",
      "accountId",
    ];

    const fieldsToCollect = requiredFields || standardFields;

    for (const field of fieldsToCollect) {
      if (context.variables[field] !== undefined) {
        info[field] = context.variables[field];
      }
    }

    return info;
  }
}
