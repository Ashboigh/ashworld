import type {
  NodeHandler,
  WorkflowNodeData,
  ExecutionContext,
  ExecutionResult,
} from "../types";

/**
 * Start node handler - entry point of workflow
 * Simply passes through to the next node
 */
export class StartHandler implements NodeHandler {
  async execute(
    node: WorkflowNodeData,
    context: ExecutionContext,
    _userMessage?: string
  ): Promise<ExecutionResult> {
    // Start node just initializes the flow, no response needed
    return {
      response: {
        type: "message",
        content: "",
      },
      context,
      nodeId: node.nodeId,
      shouldContinue: true,
    };
  }
}
