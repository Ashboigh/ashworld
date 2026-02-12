/**
 * LLM Client abstraction for OpenAI and Anthropic
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason?: string;
}

export interface IntentClassificationResult {
  intent: string;
  confidence: number;
  allIntents: Array<{ intent: string; confidence: number }>;
}

/**
 * Abstract LLM client interface
 */
export interface LLMClient {
  chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse>;
  classifyIntent(
    message: string,
    intents: Array<{ name: string; description: string }>
  ): Promise<IntentClassificationResult>;
}

/**
 * OpenAI client implementation
 */
class OpenAIClient implements LLMClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || "";
    this.baseUrl = "https://api.openai.com/v1";
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API error: ${response.status} - ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    const choice = data.choices[0];

    return {
      content: choice.message.content || "",
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
      model: data.model,
      finishReason: choice.finish_reason,
    };
  }

  async classifyIntent(
    message: string,
    intents: Array<{ name: string; description: string }>
  ): Promise<IntentClassificationResult> {
    const intentList = intents
      .map((i, idx) => `${idx + 1}. ${i.name}: ${i.description}`)
      .join("\n");

    const systemPrompt = `You are an intent classifier. Given a user message, classify it into one of the following intents:

${intentList}

Respond with JSON in this exact format:
{"intent": "intent_name", "confidence": 0.95}

Only respond with the JSON, nothing else.`;

    const response = await this.chat({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.1,
      maxTokens: 100,
    });

    try {
      const result = JSON.parse(response.content);
      return {
        intent: result.intent,
        confidence: result.confidence,
        allIntents: [{ intent: result.intent, confidence: result.confidence }],
      };
    } catch {
      // Default to first intent if parsing fails
      return {
        intent: intents[0]?.name || "unknown",
        confidence: 0.5,
        allIntents: [],
      };
    }
  }
}

/**
 * Anthropic client implementation
 */
class AnthropicClient implements LLMClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || "";
    this.baseUrl = "https://api.anthropic.com/v1";
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    if (!this.apiKey) {
      throw new Error("Anthropic API key not configured");
    }

    // Convert messages format - Anthropic uses different structure
    const systemMessage = options.messages.find((m) => m.role === "system");
    const otherMessages = options.messages.filter((m) => m.role !== "system");

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: options.model,
        max_tokens: options.maxTokens ?? 1000,
        system: systemMessage?.content || "",
        messages: otherMessages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Anthropic API error: ${response.status} - ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();

    return {
      content: data.content[0]?.text || "",
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens,
          }
        : undefined,
      model: data.model,
      finishReason: data.stop_reason,
    };
  }

  async classifyIntent(
    message: string,
    intents: Array<{ name: string; description: string }>
  ): Promise<IntentClassificationResult> {
    const intentList = intents
      .map((i, idx) => `${idx + 1}. ${i.name}: ${i.description}`)
      .join("\n");

    const systemPrompt = `You are an intent classifier. Given a user message, classify it into one of the following intents:

${intentList}

Respond with JSON in this exact format:
{"intent": "intent_name", "confidence": 0.95}

Only respond with the JSON, nothing else.`;

    const response = await this.chat({
      model: "claude-3-haiku-20240307",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      maxTokens: 100,
    });

    try {
      const result = JSON.parse(response.content);
      return {
        intent: result.intent,
        confidence: result.confidence,
        allIntents: [{ intent: result.intent, confidence: result.confidence }],
      };
    } catch {
      return {
        intent: intents[0]?.name || "unknown",
        confidence: 0.5,
        allIntents: [],
      };
    }
  }
}

// Client instances
const openaiClient = new OpenAIClient();
const anthropicClient = new AnthropicClient();

/**
 * Get raw LLM client by provider name
 */
export function getLLMClientRaw(provider: string): LLMClient {
  switch (provider.toLowerCase()) {
    case "anthropic":
      return anthropicClient;
    case "openai":
    default:
      return openaiClient;
  }
}

/**
 * Wrapper for easier LLM usage
 */
export interface SimpleLLMClientResponse {
  content: string;
  tokenCount?: number;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  model: string;
}

export interface SimpleLLMClient {
  generateResponse(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<SimpleLLMClientResponse>;
}

/**
 * Get LLM client with simpler API
 */
export function getLLMClient(provider: string, model: string): SimpleLLMClient {
  const client = getLLMClientRaw(provider);

  return {
    async generateResponse(messages, options = {}) {
      const response = await client.chat({
        model,
        messages,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      });

      return {
        content: response.content,
        tokenCount: response.usage?.totalTokens,
        usage: response.usage,
        model: response.model,
      };
    },
  };
}

/**
 * Mock client for testing
 */
export class MockLLMClient implements LLMClient {
  private responses: string[];
  private currentIndex: number = 0;

  constructor(responses: string[] = ["Mock response"]) {
    this.responses = responses;
  }

  async chat(_options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const content = this.responses[this.currentIndex % this.responses.length] ?? "Mock response";
    this.currentIndex++;
    return {
      content,
      model: "mock-model",
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    };
  }

  async classifyIntent(
    _message: string,
    intents: Array<{ name: string; description: string }>
  ): Promise<IntentClassificationResult> {
    return {
      intent: intents[0]?.name || "unknown",
      confidence: 0.9,
      allIntents: [{ intent: intents[0]?.name || "unknown", confidence: 0.9 }],
    };
  }
}
