import type {
  NodeHandler,
  WorkflowNodeData,
  ExecutionContext,
  ExecutionResult,
} from "../types";
import { evaluateCondition } from "../template-engine";

interface ConditionConfig {
  variableName: string;
  operator: string;
  value: string;
}

/**
 * Condition node handler - evaluates a condition and routes to true/false branches
 */
export class ConditionHandler implements NodeHandler {
  async execute(
    node: WorkflowNodeData,
    context: ExecutionContext,
    _userMessage?: string
  ): Promise<ExecutionResult> {
    const config = node.config as unknown as ConditionConfig;

    const variableValue = context.variables[config.variableName];
    const result = evaluateCondition(variableValue, config.operator, config.value);

    return {
      response: null,
      context,
      nodeId: node.nodeId,
      shouldContinue: true,
      // Route to "true" or "false" handle based on condition result
      selectedHandle: result ? "true" : "false",
    };
  }
}
