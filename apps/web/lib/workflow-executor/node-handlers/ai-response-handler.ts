import type {
  NodeHandler,
  WorkflowNodeData,
  ExecutionContext,
  ExecutionResult,
  ChatbotConfig,
} from "../types";
import { interpolateTemplate } from "../template-engine";
import { getLLMClient } from "../llm-client";

interface AIResponseConfig {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  useKnowledgeBase?: boolean;
  knowledgeBaseId?: string;
  responseVariable?: string;
}

/**
 * AI Response node handler - generates AI response using LLM
 */
export class AIResponseHandler implements NodeHandler {
  private chatbotConfig: ChatbotConfig;

  constructor(chatbotConfig: ChatbotConfig) {
    this.chatbotConfig = chatbotConfig;
  }

  async execute(
    node: WorkflowNodeData,
    context: ExecutionContext,
    userMessage?: string
  ): Promise<ExecutionResult> {
    const config = node.config as unknown as AIResponseConfig;
    const startTime = Date.now();

    // Build system prompt
    let systemPrompt = config.systemPrompt || "";

    // Add persona instructions if available
    if (this.chatbotConfig.personaInstructions) {
      systemPrompt = `${this.chatbotConfig.personaInstructions}\n\n${systemPrompt}`;
    }

    // Interpolate variables in system prompt
    systemPrompt = interpolateTemplate(systemPrompt, context.variables);

    // Build messages array for context
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }

    // Add conversation history (last 10 messages for context)
    const recentMessages = context.messages.slice(-10);
    for (const msg of recentMessages) {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add current user message if not already in history
    if (userMessage && !recentMessages.some(m => m.content === userMessage && m.role === "user")) {
      messages.push({ role: "user", content: userMessage });
    }

    try {
      // Get LLM client based on chatbot config
      const llmClient = getLLMClient(
        this.chatbotConfig.aiProvider,
        this.chatbotConfig.aiModel
      );

      const temperature = config.temperature ?? this.chatbotConfig.aiTemperature;
      const maxTokens = config.maxTokens ?? this.chatbotConfig.aiMaxTokens;

      const response = await llmClient.generateResponse(messages, {
        temperature,
        maxTokens,
      });

      const latencyMs = Date.now() - startTime;

      const responseMetadata = {
        aiModel: this.chatbotConfig.aiModel,
        provider: this.chatbotConfig.aiProvider,
        tokenCount: response.tokenCount,
        usage: response.usage,
        latencyMs,
      };

      // Store response in variable if configured
      const updatedVariables = { ...context.variables };
      if (config.responseVariable) {
        updatedVariables[config.responseVariable] = response.content;
      }
      updatedVariables["_lastAIResponse"] = response.content;

      return {
        response: {
          type: "message",
          content: response.content,
          metadata: {
            ...responseMetadata,
          },
        },
        context: {
          ...context,
          variables: updatedVariables,
        },
        nodeId: node.nodeId,
        shouldContinue: true,
      };
    } catch (error) {
      console.error("AI Response error:", error);

      // Return fallback message
      const fallbackMessage = this.chatbotConfig.fallbackMessage ||
        "I apologize, but I'm having trouble processing your request right now. Please try again.";

      return {
        response: {
          type: "message",
          content: fallbackMessage,
        },
        context,
        nodeId: node.nodeId,
        shouldContinue: true,
      };
    }
  }
}
