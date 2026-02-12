import type {
  NodeHandler,
  WorkflowNodeData,
  ExecutionContext,
  ExecutionResult,
} from "../types";
import { interpolateTemplate } from "../template-engine";

interface KnowledgeLookupConfig {
  knowledgeBaseId: string;
  query?: string;
  topK?: number;
  threshold?: number;
  resultVariable?: string;
}

interface KnowledgeResult {
  content: string;
  score: number;
  metadata: Record<string, unknown>;
  sourceId: string;
  sourceName?: string;
}

/**
 * Knowledge lookup node handler - searches knowledge base for relevant content
 */
export class KnowledgeLookupHandler implements NodeHandler {
  constructor(private workspaceId?: string | null) {}

  async execute(
    node: WorkflowNodeData,
    context: ExecutionContext,
    userMessage?: string
  ): Promise<ExecutionResult> {
    const config = node.config as unknown as KnowledgeLookupConfig;

    const knowledgeBaseId =
      (config.knowledgeBaseId as string | undefined) ||
      (context.variables._selectedKnowledgeBaseId as string | undefined);

    // Determine the query to use
    const query = config.query
      ? interpolateTemplate(config.query, context.variables)
      : userMessage || "";

    if (!knowledgeBaseId) {
      console.warn(
        "Knowledge lookup node skipped because no knowledge base is configured or selected"
      );

      return {
        response: null,
        context: {
          ...context,
          variables: {
            ...context.variables,
            [config.resultVariable || "_knowledgeResults"]: [],
            "_knowledgeFound": false,
          },
        },
        nodeId: node.nodeId,
        shouldContinue: true,
        selectedHandle: "no_results",
      };
    }

    if (!query) {
      // No query available, skip lookup
      return {
        response: null,
        context: {
          ...context,
          variables: {
            ...context.variables,
            [config.resultVariable || "_knowledgeResults"]: [],
            "_knowledgeFound": false,
          },
        },
        nodeId: node.nodeId,
        shouldContinue: true,
        selectedHandle: "no_results",
      };
    }

    const endpoint = this.workspaceId
      ? `/api/workspaces/${this.workspaceId}/knowledge-bases/${knowledgeBaseId}/search`
      : `/api/knowledge-bases/${knowledgeBaseId}/search`;

    if (!this.workspaceId) {
      console.warn(
        "Knowledge lookup node missing workspace id; using fallback route",
        config.knowledgeBaseId
      );
    }

    try {
      // Call knowledge base search API
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          topK: config.topK || 5,
          threshold: config.threshold || 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error("Knowledge base search failed");
      }

      const results: KnowledgeResult[] = await response.json();

      // Store results in variables
      const hasResults = results.length > 0;
      const updatedVariables = {
        ...context.variables,
        [config.resultVariable || "_knowledgeResults"]: results,
        "_knowledgeFound": hasResults,
        "_knowledgeContext": results.map((r) => r.content).join("\n\n---\n\n"),
      };

      return {
        response: null,
        context: {
          ...context,
          variables: updatedVariables,
        },
        nodeId: node.nodeId,
        shouldContinue: true,
        selectedHandle: hasResults ? "found" : "no_results",
      };
    } catch (error) {
      console.error("Knowledge lookup error:", error);

      return {
        response: null,
        context: {
          ...context,
          variables: {
            ...context.variables,
            [config.resultVariable || "_knowledgeResults"]: [],
            "_knowledgeFound": false,
            "_knowledgeError": error instanceof Error ? error.message : "Unknown error",
          },
        },
        nodeId: node.nodeId,
        shouldContinue: true,
        selectedHandle: "error",
      };
    }
  }
}
