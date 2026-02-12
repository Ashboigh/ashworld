import type {
  NodeHandler,
  WorkflowNodeData,
  ExecutionContext,
  ExecutionResult,
} from "../types";
import { evaluateCondition } from "../template-engine";

interface SwitchCase {
  id: string;
  label: string;
  operator: string;
  value: string;
}

interface SwitchConfig {
  variableName: string;
  cases: SwitchCase[];
}

/**
 * Switch node handler - evaluates multiple conditions and routes to matching case
 */
export class SwitchHandler implements NodeHandler {
  async execute(
    node: WorkflowNodeData,
    context: ExecutionContext,
    _userMessage?: string
  ): Promise<ExecutionResult> {
    const config = node.config as unknown as SwitchConfig;

    const variableValue = context.variables[config.variableName];

    // Find the first matching case
    for (const switchCase of config.cases) {
      const matches = evaluateCondition(
        variableValue,
        switchCase.operator,
        switchCase.value
      );

      if (matches) {
        return {
          response: null,
          context,
          nodeId: node.nodeId,
          shouldContinue: true,
          selectedHandle: switchCase.id,
        };
      }
    }

    // No match found, use default handle
    return {
      response: null,
      context,
      nodeId: node.nodeId,
      shouldContinue: true,
      selectedHandle: "default",
    };
  }
}
