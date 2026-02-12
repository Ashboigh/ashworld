import type {
  NodeHandler,
  WorkflowNodeData,
  ExecutionContext,
  ExecutionResult,
} from "../types";
import { interpolateTemplate } from "../template-engine";

interface ApiCallConfig {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers: Array<{ key: string; value: string }>;
  body?: string;
  responseVariable: string;
  timeout?: number;
}

/**
 * API call node handler - makes HTTP requests and stores response in variable
 */
export class ApiCallHandler implements NodeHandler {
  async execute(
    node: WorkflowNodeData,
    context: ExecutionContext,
    _userMessage?: string
  ): Promise<ExecutionResult> {
    const config = node.config as unknown as ApiCallConfig;

    // Interpolate URL and body
    const url = interpolateTemplate(config.url, context.variables);
    const body = config.body
      ? interpolateTemplate(config.body, context.variables)
      : undefined;

    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    for (const header of config.headers || []) {
      if (header.key && header.value) {
        headers[header.key] = interpolateTemplate(header.value, context.variables);
      }
    }

    try {
      const controller = new AbortController();
      const timeout = config.timeout || 30000;
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: config.method,
        headers,
        body: config.method !== "GET" && body ? body : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseData: unknown;
      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // Store response in variable
      const updatedVariables = {
        ...context.variables,
        [config.responseVariable]: responseData,
        [`${config.responseVariable}_status`]: response.status,
        [`${config.responseVariable}_ok`]: response.ok,
      };

      return {
        response: null,
        context: {
          ...context,
          variables: updatedVariables,
        },
        nodeId: node.nodeId,
        shouldContinue: true,
        // Route based on success/failure
        selectedHandle: response.ok ? "success" : "error",
      };
    } catch (error) {
      // Store error in variable
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const updatedVariables = {
        ...context.variables,
        [config.responseVariable]: null,
        [`${config.responseVariable}_status`]: 0,
        [`${config.responseVariable}_ok`]: false,
        [`${config.responseVariable}_error`]: errorMessage,
      };

      return {
        response: null,
        context: {
          ...context,
          variables: updatedVariables,
        },
        nodeId: node.nodeId,
        shouldContinue: true,
        selectedHandle: "error",
      };
    }
  }
}
