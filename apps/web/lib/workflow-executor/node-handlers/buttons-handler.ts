import type {
  NodeHandler,
  WorkflowNodeData,
  ExecutionContext,
  ExecutionResult,
} from "../types";
import { interpolateTemplate } from "../template-engine";

interface ButtonOption {
  label: string;
  value: string;
}

interface ButtonsConfig {
  message: string;
  buttons: ButtonOption[];
  variableName?: string;
}

/**
 * Buttons node handler - displays message with clickable button options
 * Waits for user to click a button before continuing
 */
export class ButtonsHandler implements NodeHandler {
  async execute(
    node: WorkflowNodeData,
    context: ExecutionContext,
    userMessage?: string
  ): Promise<ExecutionResult> {
    const config = node.config as unknown as ButtonsConfig;

    // If we're awaiting input for this node, process the response
    if (context.awaitingInput && context.awaitingInputConfig?.nodeId === node.nodeId) {
      const selectedButton = config.buttons.find(
        (btn) => btn.value === userMessage || btn.label === userMessage
      );

      if (!selectedButton) {
        // Invalid selection, show buttons again
        return {
          response: {
            type: "buttons",
            content: "Please select one of the available options.",
            buttons: config.buttons,
          },
          context: {
            ...context,
            awaitingInput: true,
            awaitingInputConfig: {
              nodeId: node.nodeId,
              type: "buttons",
              retryCount: (context.awaitingInputConfig?.retryCount || 0) + 1,
              maxRetries: 3,
            },
          },
          nodeId: node.nodeId,
          shouldContinue: false,
        };
      }

      // Store the selection in variables
      const updatedVariables = { ...context.variables };
      if (config.variableName) {
        updatedVariables[config.variableName] = selectedButton.value;
      }
      updatedVariables["_lastButtonSelection"] = selectedButton.value;

      return {
        response: null,
        context: {
          ...context,
          variables: updatedVariables,
          awaitingInput: false,
          awaitingInputConfig: undefined,
        },
        nodeId: node.nodeId,
        shouldContinue: true,
        selectedHandle: selectedButton.value,
      };
    }

    // First time hitting this node - show the buttons
    const message = interpolateTemplate(
      config.message || "Please select an option:",
      context.variables
    );

    return {
      response: {
        type: "buttons",
        content: message,
        buttons: config.buttons,
      },
      context: {
        ...context,
        awaitingInput: true,
        awaitingInputConfig: {
          nodeId: node.nodeId,
          type: "buttons",
          retryCount: 0,
          maxRetries: 3,
        },
      },
      nodeId: node.nodeId,
      shouldContinue: false,
    };
  }
}
