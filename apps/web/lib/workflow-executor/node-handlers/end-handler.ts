import type {
  NodeHandler,
  WorkflowNodeData,
  ExecutionContext,
  ExecutionResult,
} from "../types";
import { interpolateTemplate } from "../template-engine";

interface EndNodeConfig {
  message?: string;
  closeConversation?: boolean;
}

/**
 * End node handler - terminates the workflow
 */
export class EndHandler implements NodeHandler {
  async execute(
    node: WorkflowNodeData,
    context: ExecutionContext,
    _userMessage?: string
  ): Promise<ExecutionResult> {
    const config = node.config as unknown as EndNodeConfig;

    let message = "";
    if (config.message) {
      message = interpolateTemplate(config.message, context.variables);
    }

    return {
      response: {
        type: "end",
        content: message,
        metadata: {
          closeConversation: config.closeConversation !== false,
        },
      },
      context,
      nodeId: node.nodeId,
      shouldContinue: false, // End the workflow
    };
  }
}
