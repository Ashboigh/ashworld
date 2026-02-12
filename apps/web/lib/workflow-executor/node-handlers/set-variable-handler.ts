import type {
  NodeHandler,
  WorkflowNodeData,
  ExecutionContext,
  ExecutionResult,
} from "../types";
import { interpolateTemplate } from "../template-engine";

interface SetVariableConfig {
  variableName: string;
  value: string;
  valueType: "string" | "number" | "boolean" | "json";
}

/**
 * Set variable node handler - sets a context variable to a value
 */
export class SetVariableHandler implements NodeHandler {
  async execute(
    node: WorkflowNodeData,
    context: ExecutionContext,
    _userMessage?: string
  ): Promise<ExecutionResult> {
    const config = node.config as unknown as SetVariableConfig;

    // Interpolate the value first to support dynamic values
    const interpolatedValue = interpolateTemplate(
      config.value || "",
      context.variables
    );

    // Parse the value based on type
    let parsedValue: unknown;
    switch (config.valueType) {
      case "number":
        parsedValue = Number(interpolatedValue);
        if (isNaN(parsedValue as number)) {
          parsedValue = 0;
        }
        break;
      case "boolean":
        parsedValue = interpolatedValue.toLowerCase() === "true" ||
          interpolatedValue === "1";
        break;
      case "json":
        try {
          parsedValue = JSON.parse(interpolatedValue);
        } catch {
          parsedValue = interpolatedValue;
        }
        break;
      default:
        parsedValue = interpolatedValue;
    }

    return {
      response: null,
      context: {
        ...context,
        variables: {
          ...context.variables,
          [config.variableName]: parsedValue,
        },
      },
      nodeId: node.nodeId,
      shouldContinue: true,
    };
  }
}
