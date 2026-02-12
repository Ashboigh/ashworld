import type {
  NodeHandler,
  WorkflowNodeData,
  ExecutionContext,
  ExecutionResult,
} from "../types";
import { interpolateTemplate } from "../template-engine";

interface CaptureInputConfig {
  variableName: string;
  prompt: string;
  inputType: "text" | "email" | "phone" | "number" | "date";
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    patternMessage?: string;
  };
}

/**
 * Capture input node handler - prompts user for input and stores in variable
 */
export class CaptureInputHandler implements NodeHandler {
  async execute(
    node: WorkflowNodeData,
    context: ExecutionContext,
    userMessage?: string
  ): Promise<ExecutionResult> {
    const config = node.config as unknown as CaptureInputConfig;

    // If we're awaiting input for this node, validate and process the response
    if (context.awaitingInput && context.awaitingInputConfig?.nodeId === node.nodeId) {
      const validation = this.validateInput(userMessage || "", config);

      if (!validation.valid) {
        const retryCount = (context.awaitingInputConfig?.retryCount || 0) + 1;
        const maxRetries = context.awaitingInputConfig?.maxRetries || 3;

        if (retryCount >= maxRetries) {
          // Max retries reached, continue with empty/invalid value
          return {
            response: {
              type: "message",
              content: "Let's continue with what you provided.",
            },
            context: {
              ...context,
              variables: {
                ...context.variables,
                [config.variableName]: userMessage || "",
              },
              awaitingInput: false,
              awaitingInputConfig: undefined,
            },
            nodeId: node.nodeId,
            shouldContinue: true,
          };
        }

        return {
          response: {
            type: "input_request",
            content: validation.message || "Please provide a valid input.",
            inputType: config.inputType,
          },
          context: {
            ...context,
            awaitingInput: true,
            awaitingInputConfig: {
              ...context.awaitingInputConfig,
              retryCount,
            },
          },
          nodeId: node.nodeId,
          shouldContinue: false,
        };
      }

      // Valid input, store and continue
      return {
        response: null,
        context: {
          ...context,
          variables: {
            ...context.variables,
            [config.variableName]: this.parseInput(userMessage || "", config.inputType),
          },
          awaitingInput: false,
          awaitingInputConfig: undefined,
        },
        nodeId: node.nodeId,
        shouldContinue: true,
      };
    }

    // First time hitting this node - show the prompt
    const prompt = interpolateTemplate(
      config.prompt || `Please enter your ${config.variableName}:`,
      context.variables
    );

    return {
      response: {
        type: "input_request",
        content: prompt,
        inputType: config.inputType,
      },
      context: {
        ...context,
        awaitingInput: true,
        awaitingInputConfig: {
          nodeId: node.nodeId,
          type: "capture_input",
          validation: config.validation,
          retryCount: 0,
          maxRetries: 3,
        },
      },
      nodeId: node.nodeId,
      shouldContinue: false,
    };
  }

  private validateInput(
    input: string,
    config: CaptureInputConfig
  ): { valid: boolean; message?: string } {
    const validation = config.validation || {};
    const trimmed = input.trim();

    // Required check
    if (validation.required && !trimmed) {
      return { valid: false, message: "This field is required." };
    }

    if (!trimmed && !validation.required) {
      return { valid: true };
    }

    // Length checks
    if (validation.minLength && trimmed.length < validation.minLength) {
      return {
        valid: false,
        message: `Please enter at least ${validation.minLength} characters.`,
      };
    }

    if (validation.maxLength && trimmed.length > validation.maxLength) {
      return {
        valid: false,
        message: `Please enter no more than ${validation.maxLength} characters.`,
      };
    }

    // Type-specific validation
    switch (config.inputType) {
      case "email": {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
          return { valid: false, message: "Please enter a valid email address." };
        }
        break;
      }
      case "phone": {
        const phoneRegex = /^[\d\s\-+()]+$/;
        if (!phoneRegex.test(trimmed) || trimmed.replace(/\D/g, "").length < 7) {
          return { valid: false, message: "Please enter a valid phone number." };
        }
        break;
      }
      case "number": {
        if (isNaN(Number(trimmed))) {
          return { valid: false, message: "Please enter a valid number." };
        }
        break;
      }
      case "date": {
        const date = new Date(trimmed);
        if (isNaN(date.getTime())) {
          return { valid: false, message: "Please enter a valid date." };
        }
        break;
      }
    }

    // Custom pattern validation
    if (validation.pattern) {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(trimmed)) {
        return {
          valid: false,
          message: validation.patternMessage || "Please enter a valid value.",
        };
      }
    }

    return { valid: true };
  }

  private parseInput(input: string, inputType: string): unknown {
    const trimmed = input.trim();
    switch (inputType) {
      case "number":
        return Number(trimmed);
      case "date":
        return new Date(trimmed).toISOString();
      default:
        return trimmed;
    }
  }
}
