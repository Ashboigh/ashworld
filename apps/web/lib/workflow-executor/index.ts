import type {
  NodeHandler,
  WorkflowNodeData,
  WorkflowEdgeData,
  ExecutionContext,
  ExecutionResult,
  ChatbotConfig,
} from "./types";
import { createInitialContext } from "./types";
import {
  StartHandler,
  EndHandler,
  SendMessageHandler,
  ButtonsHandler,
  CaptureInputHandler,
  ConditionHandler,
  SwitchHandler,
  SetVariableHandler,
  ApiCallHandler,
  AIResponseHandler,
  KnowledgeLookupHandler,
  IntentClassifierHandler,
  HumanHandoffHandler,
  IntegrationActionHandler,
} from "./node-handlers";

export * from "./types";
export * from "./template-engine";

interface WorkflowDefinition {
  nodes: WorkflowNodeData[];
  edges: WorkflowEdgeData[];
}

interface StartConversationOptions {
  initialVariables?: Record<string, unknown>;
  awaitingInput?: boolean;
  awaitingInputConfig?: ExecutionContext["awaitingInputConfig"];
}

/**
 * WorkflowExecutor - Executes workflow nodes based on user messages
 */
export class WorkflowExecutor {
  private nodes: Map<string, WorkflowNodeData>;
  private edges: WorkflowEdgeData[];
  private handlers: Map<string, NodeHandler>;
  private chatbotConfig: ChatbotConfig;

  constructor(workflow: WorkflowDefinition, chatbotConfig: ChatbotConfig) {
    this.nodes = new Map(workflow.nodes.map((node) => [node.nodeId, node]));
    this.edges = workflow.edges;
    this.chatbotConfig = chatbotConfig;
    this.handlers = this.initializeHandlers();
  }

  private initializeHandlers(): Map<string, NodeHandler> {
    const handlers = new Map<string, NodeHandler>();

    // Basic nodes
    handlers.set("start", new StartHandler());
    handlers.set("end", new EndHandler());
    handlers.set("send_message", new SendMessageHandler());
    handlers.set("buttons", new ButtonsHandler());
    handlers.set("capture_input", new CaptureInputHandler());

    // Logic nodes
    handlers.set("condition", new ConditionHandler());
    handlers.set("switch", new SwitchHandler());
    handlers.set("set_variable", new SetVariableHandler());

    // Integration nodes
    handlers.set("api_call", new ApiCallHandler());
    handlers.set("integration_action", new IntegrationActionHandler());

    // AI nodes (require chatbot config)
    handlers.set("ai_response", new AIResponseHandler(this.chatbotConfig));
    handlers.set(
      "knowledge_lookup",
      new KnowledgeLookupHandler(this.chatbotConfig.workspaceId)
    );
    handlers.set("intent_classifier", new IntentClassifierHandler(this.chatbotConfig));

    // Handoff
    handlers.set("human_handoff", new HumanHandoffHandler(this.chatbotConfig));

    return handlers;
  }

  /**
   * Start a new conversation by executing from the start node
   */
  async startConversation(
    conversationId: string,
    sessionId: string,
    chatbotId: string,
    workflowId: string,
    options?: StartConversationOptions
  ): Promise<{ results: ExecutionResult[]; context: ExecutionContext }> {
    // Initialize execution context
    const context: ExecutionContext = createInitialContext(
      conversationId,
      sessionId,
      chatbotId,
      workflowId
    );

    if (options?.initialVariables) {
      context.variables = {
        ...context.variables,
        ...options.initialVariables,
      };
    }

    if (typeof options?.awaitingInput === "boolean") {
      context.awaitingInput = options.awaitingInput;
    }

    if (options?.awaitingInputConfig) {
      context.awaitingInputConfig = options.awaitingInputConfig;
    }

    // Find start node
    const startNode = Array.from(this.nodes.values()).find(
      (node) => node.type === "start"
    );

    if (!startNode) {
      throw new Error("Workflow has no start node");
    }

    // Execute from start node
    return this.executeFromNode(startNode.nodeId, context);
  }

  /**
   * Process a user message within an existing conversation
   */
  async processMessage(
    userMessage: string,
    context: ExecutionContext
  ): Promise<{ results: ExecutionResult[]; context: ExecutionContext }> {
    // Add user message to history
    const updatedContext: ExecutionContext = {
      ...context,
      messages: [
        ...context.messages,
        {
          role: "user" as const,
          content: userMessage,
          timestamp: Date.now(),
        },
      ],
    };

    // If awaiting input, process from the waiting node
    if (context.awaitingInput && context.awaitingInputConfig?.nodeId) {
      return this.executeFromNode(
        context.awaitingInputConfig.nodeId,
        updatedContext,
        userMessage
      );
    }

    // Otherwise, find where to continue from
    // If we have a current node, try to find the next node
    if (context.currentNodeId) {
      const nextEdge = this.findNextEdge(context.currentNodeId);
      if (nextEdge) {
        return this.executeFromNode(nextEdge.target, updatedContext, userMessage);
      }
    }

    // No current position - start from beginning
    const startNode = Array.from(this.nodes.values()).find(
      (node) => node.type === "start"
    );

    if (!startNode) {
      throw new Error("Workflow has no start node");
    }

    return this.executeFromNode(startNode.nodeId, updatedContext, userMessage);
  }

  /**
   * Execute workflow starting from a specific node
   */
  private async executeFromNode(
    nodeId: string,
    context: ExecutionContext,
    userMessage?: string,
    sourceHandle?: string
  ): Promise<{ results: ExecutionResult[]; context: ExecutionContext }> {
    const results: ExecutionResult[] = [];
    let currentNodeId: string | null = nodeId;
    let currentContext = { ...context };
    let currentSourceHandle = sourceHandle;
    let iterations = 0;
    const maxIterations = 100; // Prevent infinite loops

    while (currentNodeId && iterations < maxIterations) {
      iterations++;

      const node = this.nodes.get(currentNodeId);
      if (!node) {
        console.error(`Node not found: ${currentNodeId}`);
        break;
      }

      const handler = this.handlers.get(node.type);
      if (!handler) {
        console.error(`No handler for node type: ${node.type}`);
        break;
      }

      // Record execution start
      const executionStart = Date.now();

      // Execute the node
      const result = await handler.execute(node, currentContext, userMessage);

      // Record execution in history
      currentContext = {
        ...result.context,
        currentNodeId: currentNodeId,
        executionHistory: [
          ...result.context.executionHistory,
          {
            nodeId: currentNodeId,
            nodeType: node.type,
            timestamp: Date.now(),
            input: userMessage,
            output: result.response?.content,
            duration: Date.now() - executionStart,
          },
        ],
      };

      // Add response to messages if present
      if (result.response?.content) {
        currentContext.messages = [
          ...currentContext.messages,
          {
            role: "assistant" as const,
            content: result.response.content,
            timestamp: Date.now(),
            nodeId: currentNodeId,
          },
        ];
      }

      // Store result
      results.push(result);

      // Update conversation status if specified
      if (result.conversationStatus) {
        currentContext = {
          ...currentContext,
          variables: {
            ...currentContext.variables,
            _conversationStatus: result.conversationStatus,
          },
        };
      }

      // Stop if node says not to continue or if awaiting input
      if (!result.shouldContinue || currentContext.awaitingInput) {
        break;
      }

      // Clear user message after first node processes it
      userMessage = undefined;

      // Find next node
      const nextEdge = this.findNextEdge(
        currentNodeId,
        result.selectedHandle || currentSourceHandle
      );

      if (nextEdge) {
        currentNodeId = nextEdge.target;
        currentSourceHandle = undefined;
      } else {
        currentNodeId = null;
      }
    }

    if (iterations >= maxIterations) {
      console.error("Workflow execution exceeded maximum iterations");
    }

    return { results, context: currentContext };
  }

  /**
   * Find the next edge to follow from a node
   */
  private findNextEdge(
    nodeId: string,
    sourceHandle?: string
  ): WorkflowEdgeData | null {
    // If a specific handle is requested, find that edge
    if (sourceHandle) {
      const handleEdge = this.edges.find(
        (edge) =>
          edge.source === nodeId &&
          edge.sourceHandle === sourceHandle
      );
      if (handleEdge) return handleEdge;
    }

    // Otherwise, find any edge from this node (prefer default/no handle)
    const edges = this.edges.filter((edge) => edge.source === nodeId);

    if (edges.length === 0) return null;

    // Prefer edge without specific handle
    const defaultEdge = edges.find((edge) => !edge.sourceHandle);
    return defaultEdge ?? edges[0] ?? null;
  }

  /**
   * Get the current execution state for persistence
   */
  getExecutionState(context: ExecutionContext): {
    currentNodeId: string | null;
    variables: Record<string, unknown>;
    awaitingInput: boolean;
    awaitingInputConfig?: ExecutionContext["awaitingInputConfig"];
  } {
    return {
      currentNodeId: context.currentNodeId,
      variables: context.variables,
      awaitingInput: context.awaitingInput,
      awaitingInputConfig: context.awaitingInputConfig,
    };
  }

  /**
   * Restore execution context from persisted state
   */
  restoreContext(
    conversationId: string,
    sessionId: string,
    chatbotId: string,
    workflowId: string,
    messages: ExecutionContext["messages"],
    state: ReturnType<typeof this.getExecutionState>
  ): ExecutionContext {
    return {
      conversationId,
      sessionId,
      chatbotId,
      workflowId,
      currentNodeId: state.currentNodeId,
      variables: state.variables,
      messages,
      executionHistory: [],
      awaitingInput: state.awaitingInput,
      awaitingInputConfig: state.awaitingInputConfig,
    };
  }
}

/**
 * Helper to create executor from database models
 */
export async function createWorkflowExecutor(
  workflow: {
    nodes: Array<{
      id: string;
      nodeId: string;
      type: string;
      positionX: number;
      positionY: number;
      config: unknown;
    }>;
    edges: Array<{
      id: string;
      edgeId: string;
      source: string;
      target: string;
      sourceHandle?: string | null;
      label?: string | null;
    }>;
  },
  chatbot: ChatbotConfig
): Promise<WorkflowExecutor> {
  const chatbotConfig: ChatbotConfig = {
    id: chatbot.id,
    personaName: chatbot.personaName || null,
    personaRole: chatbot.personaRole || null,
    personaTone: chatbot.personaTone || null,
    personaInstructions: chatbot.personaInstructions || null,
    aiProvider: chatbot.aiProvider,
    aiModel: chatbot.aiModel,
    aiTemperature: chatbot.aiTemperature,
    aiMaxTokens: chatbot.aiMaxTokens,
    greetingMessage: chatbot.greetingMessage || null,
    fallbackMessage: chatbot.fallbackMessage || null,
    handoffMessage: chatbot.handoffMessage || null,
    workspaceId: chatbot.workspaceId || null,
  };

  // Map Prisma models to executor types
  const nodes: WorkflowNodeData[] = workflow.nodes.map((node) => ({
    id: node.id,
    nodeId: node.nodeId,
    type: node.type,
    positionX: node.positionX,
    positionY: node.positionY,
    config: (node.config as Record<string, unknown>) || {},
  }));

  const edges: WorkflowEdgeData[] = workflow.edges.map((edge) => ({
    id: edge.id,
    edgeId: edge.edgeId,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    label: edge.label,
  }));

  return new WorkflowExecutor({ nodes, edges }, chatbotConfig);
}
