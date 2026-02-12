"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { WorkflowToolbar } from "./workflow-toolbar";
import { NodePalette } from "./node-palette";
import { WorkflowCanvas } from "./workflow-canvas";
import { NodeConfigPanel } from "./node-config-panel";
import { TestPanel } from "./test-panel";
import {
  NODE_METADATA,
  type WorkflowNode,
  type WorkflowEdge,
  type WorkflowData,
  type WorkflowVariable,
  type NodeType,
  type ExecutionContext,
} from "@/lib/workflow";

interface KnowledgeBase {
  id: string;
  name: string;
}

interface WorkflowBuilderProps {
  workspaceId: string;
  workflow: WorkflowData;
  knowledgeBases: KnowledgeBase[];
  orgSlug: string;
}

function WorkflowBuilderInner({
  workspaceId,
  workflow: initialWorkflow,
  knowledgeBases,
  orgSlug,
}: WorkflowBuilderProps) {
  const router = useRouter();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Workflow state
  const [nodes, setNodes] = useNodesState<WorkflowNode>(initialWorkflow.nodes);
  const [edges, setEdges] = useEdgesState<WorkflowEdge>(initialWorkflow.edges);
  const [variables, setVariables] = useState<WorkflowVariable[]>(
    initialWorkflow.variables
  );
  const [workflowMeta, setWorkflowMeta] = useState({
    name: initialWorkflow.name,
    description: initialWorkflow.description,
    status: initialWorkflow.status,
    version: initialWorkflow.version,
  });

  // UI state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isTestPanelOpen, setIsTestPanelOpen] = useState(false);

  // Test execution state
  const [testContext, setTestContext] = useState<ExecutionContext>({
    variables: {},
    currentNodeId: null,
    history: [],
    messages: [],
  });

  // Track changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [nodes, edges, variables]);

  // Auto-save with debounce
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 5000); // Auto-save after 5 seconds of inactivity

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, edges, variables, hasUnsavedChanges]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  // Handle node changes
  const onNodesChange = useCallback(
    (changes: NodeChange<WorkflowNode>[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes]
  );

  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes: EdgeChange<WorkflowEdge>[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges]
  );

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: `e-${connection.source}-${connection.target}-${Date.now()}`,
            type: "smoothstep",
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Handle drag start from palette
  const onDragStart = useCallback(
    (event: React.DragEvent, nodeType: NodeType) => {
      event.dataTransfer.setData("application/reactflow", nodeType);
      event.dataTransfer.effectAllowed = "move";
    },
    []
  );

  // Handle drag over
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Handle drop to create new node
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData(
        "application/reactflow"
      ) as NodeType;
      if (!nodeType) return;

      const meta = NODE_METADATA[nodeType];
      if (!meta) return;

      // Get position from drop coordinates
      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const position = {
        x: event.clientX - reactFlowBounds.left - 90,
        y: event.clientY - reactFlowBounds.top - 30,
      };

      const newNode: WorkflowNode = {
        id: `${nodeType}-${Date.now()}`,
        type: nodeType,
        position,
        data: {
          type: nodeType,
          label: meta.label,
          config: { ...meta.defaultConfig },
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  // Update node
  const handleUpdateNode = useCallback(
    (nodeId: string, updates: Partial<WorkflowNode>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, ...updates } : node
        )
      );
    },
    [setNodes]
  );

  // Save workflow
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/workflows/${initialWorkflow.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: workflowMeta.name,
            description: workflowMeta.description,
            nodes: nodes.map((n) => ({
              nodeId: n.id,
              type: n.type,
              positionX: n.position.x,
              positionY: n.position.y,
              config: n.data.config,
            })),
            edges: edges.map((e) => ({
              edgeId: e.id,
              source: e.source,
              target: e.target,
              sourceHandle: e.sourceHandle,
              label: e.data?.label,
            })),
            variables,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to save");

      setHasUnsavedChanges(false);
      toast.success("Workflow saved");
    } catch (error) {
      toast.error("Failed to save workflow");
    } finally {
      setIsSaving(false);
    }
  };

  // Publish workflow
  const handlePublish = async () => {
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/workflows/${initialWorkflow.id}/publish`,
        { method: "POST" }
      );

      if (!response.ok) throw new Error("Failed to publish");

      const data = await response.json();
      setWorkflowMeta((m) => ({
        ...m,
        status: "published",
        version: data.version,
      }));
      toast.success(`Workflow published as v${data.version}`);
    } catch (error) {
      toast.error("Failed to publish workflow");
    }
  };

  // Export workflow as JSON
  const handleExport = () => {
    const data: WorkflowData = {
      ...initialWorkflow,
      ...workflowMeta,
      nodes,
      edges,
      variables,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflowMeta.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import workflow from JSON
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text) as WorkflowData;
        setNodes(data.nodes);
        setEdges(data.edges);
        setVariables(data.variables);
        toast.success("Workflow imported");
      } catch (error) {
        toast.error("Failed to import workflow");
      }
    };
    input.click();
  };

  // Test panel handlers
  const handleTestMessage = (message: string) => {
    setTestContext((ctx) => ({
      ...ctx,
      variables: { ...ctx.variables, message },
      messages: [
        ...ctx.messages,
        { role: "user", content: message, timestamp: Date.now() },
      ],
    }));

    // Simulate bot response
    setTimeout(() => {
      setTestContext((ctx) => ({
        ...ctx,
        messages: [
          ...ctx.messages,
          {
            role: "assistant",
            content: "This is a test response. Connect to workflow execution for real responses.",
            timestamp: Date.now(),
          },
        ],
      }));
    }, 500);
  };

  const handleResetTest = () => {
    setTestContext({
      variables: {},
      currentNodeId: null,
      history: [],
      messages: [],
    });
  };

  return (
    <div ref={reactFlowWrapper} className="flex flex-col h-screen">
      <WorkflowToolbar
        workflowName={workflowMeta.name}
        status={workflowMeta.status}
        version={workflowMeta.version}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={handleSave}
        onPublish={handlePublish}
        onTest={() => setIsTestPanelOpen(true)}
        onExport={handleExport}
        onImport={handleImport}
        onViewHistory={() => {
          router.push(
            `/${orgSlug}/workflows/${initialWorkflow.id}/history`
          );
        }}
      />

      <div className="flex flex-1 overflow-hidden">
        <NodePalette onDragStart={onDragStart} />

        <WorkflowCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeSelect={setSelectedNodeId}
          onDrop={onDrop}
          onDragOver={onDragOver}
        />

        <NodeConfigPanel
          node={selectedNode}
          variables={variables}
          knowledgeBases={knowledgeBases}
          onClose={() => setSelectedNodeId(null)}
          onUpdateNode={handleUpdateNode}
        />
      </div>

      <TestPanel
        isOpen={isTestPanelOpen}
        onClose={() => setIsTestPanelOpen(false)}
        context={testContext}
        onSendMessage={handleTestMessage}
        onReset={handleResetTest}
        currentNodeId={testContext.currentNodeId}
        onHighlightNode={(nodeId) => {
          setSelectedNodeId(nodeId);
        }}
      />
    </div>
  );
}

export function WorkflowBuilder(props: WorkflowBuilderProps) {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner {...props} />
    </ReactFlowProvider>
  );
}
