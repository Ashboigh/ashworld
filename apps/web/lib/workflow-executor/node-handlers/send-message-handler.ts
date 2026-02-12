import type {
  NodeHandler,
  WorkflowNodeData,
  ExecutionContext,
  ExecutionResult,
} from "../types";
import { interpolateTemplate } from "../template-engine";

interface SendMessageConfig {
  message: string;
}

/**
 * Send message node handler - sends a static or templated message
 */
export class SendMessageHandler implements NodeHandler {
  async execute(
    node: WorkflowNodeData,
    context: ExecutionContext,
    _userMessage?: string
  ): Promise<ExecutionResult> {
    const config = node.config as unknown as SendMessageConfig;

    const message = interpolateTemplate(
      config.message || "Hello!",
      context.variables
    );

    return {
      response: {
        type: "message",
        content: message,
      },
      context,
      nodeId: node.nodeId,
      shouldContinue: true,
    };
  }
}
