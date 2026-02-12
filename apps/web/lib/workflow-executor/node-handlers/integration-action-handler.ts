/**
 * Integration Action Node Handler
 * Executes third-party integration actions (CRM, Helpdesk, etc.)
 */

import type {
  NodeHandler,
  WorkflowNodeData,
  ExecutionContext,
  ExecutionResult,
} from "../types";
import { interpolateTemplate } from "../template-engine";
import {
  executeAction,
  IntegrationActionType,
} from "@/lib/integrations/action-executor";

interface IntegrationActionConfig {
  integrationId: string;
  actionType: IntegrationActionType;
  inputs: Record<string, string>;
  responseVariable: string;
  continueOnError?: boolean;
}

/**
 * Integration action node handler - executes third-party integration actions
 */
export class IntegrationActionHandler implements NodeHandler {
  async execute(
    node: WorkflowNodeData,
    context: ExecutionContext,
    _userMessage?: string
  ): Promise<ExecutionResult> {
    const config = node.config as unknown as IntegrationActionConfig;

    // Interpolate input values
    const interpolatedInputs: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(config.inputs || {})) {
      if (typeof value === "string") {
        interpolatedInputs[key] = interpolateTemplate(value, context.variables);
      } else {
        interpolatedInputs[key] = value;
      }
    }

    try {
      // Execute the integration action
      const result = await executeAction(
        config.actionType,
        {
          integrationId: config.integrationId,
          workflowId: context.workflowId,
          conversationId: context.conversationId,
          variables: context.variables,
        },
        interpolatedInputs
      );

      // Store result in variable
      const updatedVariables = {
        ...context.variables,
        [config.responseVariable]: result.data,
        [`${config.responseVariable}_success`]: result.success,
        [`${config.responseVariable}_error`]: result.error,
        [`${config.responseVariable}_metadata`]: result.metadata,
      };

      // Determine which handle to follow
      let selectedHandle: string;
      if (result.success) {
        selectedHandle = "success";
      } else if (config.continueOnError) {
        selectedHandle = "error";
      } else {
        // If not continuing on error, still follow error path but log
        console.error(
          `Integration action failed: ${config.actionType}`,
          result.error
        );
        selectedHandle = "error";
      }

      return {
        response: null,
        context: {
          ...context,
          variables: updatedVariables,
        },
        nodeId: node.nodeId,
        shouldContinue: true,
        selectedHandle,
      };
    } catch (error) {
      // Handle unexpected errors
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      console.error(`Integration action error: ${config.actionType}`, error);

      const updatedVariables = {
        ...context.variables,
        [config.responseVariable]: null,
        [`${config.responseVariable}_success`]: false,
        [`${config.responseVariable}_error`]: errorMessage,
      };

      return {
        response: null,
        context: {
          ...context,
          variables: updatedVariables,
        },
        nodeId: node.nodeId,
        shouldContinue: config.continueOnError ?? true,
        selectedHandle: "error",
      };
    }
  }
}
