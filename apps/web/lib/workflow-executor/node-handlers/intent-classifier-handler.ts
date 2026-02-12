import type {
  NodeHandler,
  WorkflowNodeData,
  ExecutionContext,
  ExecutionResult,
  ChatbotConfig,
} from "../types";
import { getLLMClient } from "../llm-client";

interface IntentOption {
  id: string;
  label: string;
  description: string;
  examples?: string[];
}

interface IntentClassifierConfig {
  intents: IntentOption[];
  confidenceThreshold?: number;
  resultVariable?: string;
}

/**
 * Intent classifier node handler - uses AI to classify user intent
 */
export class IntentClassifierHandler implements NodeHandler {
  private chatbotConfig: ChatbotConfig;

  constructor(chatbotConfig: ChatbotConfig) {
    this.chatbotConfig = chatbotConfig;
  }

  async execute(
    node: WorkflowNodeData,
    context: ExecutionContext,
    userMessage?: string
  ): Promise<ExecutionResult> {
    const config = node.config as unknown as IntentClassifierConfig;

    if (!userMessage) {
      return {
        response: null,
        context,
        nodeId: node.nodeId,
        shouldContinue: true,
        selectedHandle: "unknown",
      };
    }

    // Build the classification prompt
    const intentDescriptions = config.intents
      .map((intent) => {
        let desc = `- ${intent.id}: ${intent.description}`;
        if (intent.examples && intent.examples.length > 0) {
          desc += `\n  Examples: ${intent.examples.slice(0, 3).join(", ")}`;
        }
        return desc;
      })
      .join("\n");

    const systemPrompt = `You are an intent classifier. Your task is to classify the user's message into one of the following intents:

${intentDescriptions}
- unknown: None of the above intents match

Respond with ONLY a JSON object in this exact format:
{"intent": "<intent_id>", "confidence": <0.0-1.0>}

Be concise and accurate. If the message doesn't clearly match any intent, use "unknown".`;

    try {
      const llmClient = getLLMClient(
        this.chatbotConfig.aiProvider,
        this.chatbotConfig.aiModel
      );

      const response = await llmClient.generateResponse(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        {
          temperature: 0.1, // Low temperature for consistent classification
          maxTokens: 100,
        }
      );

      // Parse the response
      let classification: { intent: string; confidence: number };
      try {
        // Extract JSON from response (handle potential markdown code blocks)
        const jsonMatch = response.content.match(/\{[\s\S]*?\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in response");
        }
        classification = JSON.parse(jsonMatch[0]);
      } catch {
        console.error("Failed to parse intent classification:", response.content);
        classification = { intent: "unknown", confidence: 0 };
      }

      const threshold = config.confidenceThreshold || 0.7;
      const finalIntent =
        classification.confidence >= threshold ? classification.intent : "unknown";

      // Verify the intent is valid
      const validIntentIds = config.intents.map((i) => i.id);
      const selectedIntent = validIntentIds.includes(finalIntent) ? finalIntent : "unknown";

      // Store result in variables
      const updatedVariables = {
        ...context.variables,
        [config.resultVariable || "_classifiedIntent"]: selectedIntent,
        "_intentConfidence": classification.confidence,
        "_intentRaw": classification,
      };

      return {
        response: null,
        context: {
          ...context,
          variables: updatedVariables,
        },
        nodeId: node.nodeId,
        shouldContinue: true,
        selectedHandle: selectedIntent,
      };
    } catch (error) {
      console.error("Intent classification error:", error);

      return {
        response: null,
        context: {
          ...context,
          variables: {
            ...context.variables,
            [config.resultVariable || "_classifiedIntent"]: "unknown",
            "_intentConfidence": 0,
          },
        },
        nodeId: node.nodeId,
        shouldContinue: true,
        selectedHandle: "unknown",
      };
    }
  }
}
