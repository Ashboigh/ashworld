import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import crypto from "crypto";
import { createWorkflowExecutor } from "@/lib/workflow-executor";
import { emitLiveChatEvent } from "@/lib/live-chat/events";
import { recordAnalyticsEvent } from "@/lib/analytics/events";
import { chatApiCorsPreflight, withChatApiCors } from "@/lib/network/cors";

/**
 * POST /api/chat/[chatbotId]/start
 * Start a new conversation with a chatbot
 * Public endpoint - no authentication required
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params;
    let requestBody: Record<string, unknown> = {};
    try {
      requestBody = await request.json();
    } catch {
      requestBody = {};
    }
    const requestedWorkflowId =
      typeof requestBody.workflowId === "string" && requestBody.workflowId.trim()
        ? requestBody.workflowId
        : null;
    const selectedKnowledgeBaseId =
      typeof requestBody.knowledgeBaseId === "string" &&
      requestBody.knowledgeBaseId !== "none" &&
      requestBody.knowledgeBaseId.trim()
        ? requestBody.knowledgeBaseId
        : null;

    // Get chatbot with workflow
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: {
        workspace: true,
      },
    });

    if (!chatbot) {
      return withChatApiCors(NextResponse.json(
        { error: "Chatbot not found" },
        { status: 404 }
      ));
    }

    if (chatbot.status !== "active") {
      return withChatApiCors(NextResponse.json(
        { error: "Chatbot is not active" },
        { status: 400 }
      ));
    }

    const workspaceId = chatbot.workspaceId || chatbot.workspace?.id;

    // Generate unique session ID
    const sessionId = `sess_${crypto.randomUUID().replace(/-/g, "")}`;

    // Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        chatbotId,
        sessionId,
        status: "active",
        context: {},
        metadata: {
          userAgent: request.headers.get("user-agent") || "unknown",
          ...(selectedKnowledgeBaseId
            ? { knowledgeBaseId: selectedKnowledgeBaseId }
            : {}),
          startedAt: new Date().toISOString(),
        },
      },
    });

    if (chatbot.workspace?.organizationId) {
      await recordAnalyticsEvent({
        organizationId: chatbot.workspace.organizationId,
        workspaceId: chatbot.workspace.id,
        chatbotId,
        conversationId: conversation.id,
        eventType: "conversation.started",
        payload: {
          userAgent: request.headers.get("user-agent") || "unknown",
        },
      });
    }

    // Prepare initial response
    const initialMessages: Array<{
      role: string;
      content: string;
      type?: string;
      buttons?: Array<{ label: string; value: string }>;
    }> = [];

    // If chatbot has a workflow, execute from start
    const workflowCandidateId = requestedWorkflowId || chatbot.defaultWorkflowId;
    let workflowExecutionId: string | null = null;
    let workflowUpdateApplied = false;

    console.log("[DEBUG] Workflow lookup:", {
      workflowCandidateId,
      chatbotWorkspaceId: workspaceId,
      requestedWorkflowId,
      defaultWorkflowId: chatbot.defaultWorkflowId,
    });

    if (workflowCandidateId) {
      const workflow = await prisma.workflow.findFirst({
        where: {
          id: workflowCandidateId,
          status: "published",
          ...(workspaceId ? { workspaceId } : {}),
        },
        include: {
          nodes: true,
          edges: true,
        },
      });

      console.log("[DEBUG] Workflow found:", workflow ? {
        id: workflow.id,
        name: workflow.name,
        status: workflow.status,
        workspaceId: workflow.workspaceId,
        nodeCount: workflow.nodes.length,
        edgeCount: workflow.edges.length,
      } : null);

      if (workflow) {
        workflowExecutionId = workflow.id;
        try {
          const executor = await createWorkflowExecutor(
            {
              nodes: workflow.nodes,
              edges: workflow.edges,
            },
            { ...chatbot, workspaceId }
          );

          const { results, context } = await executor.startConversation(
            conversation.id,
            sessionId,
            chatbotId,
            workflow.id,
            {
              initialVariables: selectedKnowledgeBaseId
                ? { _selectedKnowledgeBaseId: selectedKnowledgeBaseId }
                : undefined,
            }
          );

          // Save execution state
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              workflowId: workflow.id,
              currentNodeId: context.currentNodeId,
              context: JSON.parse(
                JSON.stringify({
                  variables: context.variables,
                  awaitingInput: context.awaitingInput,
                  awaitingInputConfig: context.awaitingInputConfig,
                })
              ),
            },
          });

          workflowUpdateApplied = true;

          // Save messages
          for (const result of results) {
            if (result.response?.content) {
              const createdMessage = await prisma.message.create({
                data: {
                  conversationId: conversation.id,
                  role: "assistant",
                  content: result.response.content,
                  nodeId: result.nodeId,
                  metadata: JSON.parse(
                    JSON.stringify(result.response.metadata || {})
                  ),
                },
              });

              emitLiveChatEvent({
                type: "conversation.message",
                payload: {
                  organizationId: chatbot.workspace?.organizationId ?? null,
                  conversationId: conversation.id,
                  message: {
                    id: createdMessage.id,
                    role: createdMessage.role,
                    content: createdMessage.content,
                    nodeId: createdMessage.nodeId,
                    aiModel: createdMessage.aiModel,
                    tokenCount: createdMessage.tokenCount,
                    latencyMs: createdMessage.latencyMs,
                    feedbackRating: createdMessage.feedbackRating,
                    feedbackText: createdMessage.feedbackText,
                    createdAt: createdMessage.createdAt.toISOString(),
                  },
                },
              });

              initialMessages.push({
                role: "assistant",
                content: result.response.content,
                type: result.response.type,
                buttons: result.response.buttons,
              });
              if (chatbot.workspace?.organizationId) {
                await recordAnalyticsEvent({
                  organizationId: chatbot.workspace.organizationId,
                  workspaceId: chatbot.workspace.id,
                  chatbotId,
                  conversationId: conversation.id,
                  eventType: "message.sent",
                  payload: {
                    role: "assistant",
                    nodeId: result.nodeId,
                    source: "workflow",
                    workflowId: workflow.id,
                  },
                });
                await recordAnalyticsEvent({
                  organizationId: chatbot.workspace.organizationId,
                  workspaceId: chatbot.workspace.id,
                  chatbotId,
                  conversationId: conversation.id,
                  eventType: "workflow.node.executed",
                  payload: {
                    nodeId: result.nodeId,
                    type: result.response.type,
                    workflowId: workflow.id,
                  },
                });
              }
            }
          }
        } catch (error) {
          console.error("[DEBUG] Workflow execution error:", error);
          console.error("[DEBUG] Error stack:", error instanceof Error ? error.stack : "no stack");
          // Fall back to greeting message
        }
      }
    }

    if (workflowExecutionId && !workflowUpdateApplied) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          workflowId: workflowExecutionId,
        },
      });
    }

    // If no workflow messages, use greeting message
    if (initialMessages.length === 0 && chatbot.greetingMessage) {
      const greetingMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          content: chatbot.greetingMessage,
          metadata: {},
        },
      });

      emitLiveChatEvent({
        type: "conversation.message",
        payload: {
          organizationId: chatbot.workspace?.organizationId ?? null,
          conversationId: conversation.id,
          message: {
            id: greetingMessage.id,
            role: greetingMessage.role,
            content: greetingMessage.content,
            nodeId: greetingMessage.nodeId,
            aiModel: greetingMessage.aiModel,
            tokenCount: greetingMessage.tokenCount,
            latencyMs: greetingMessage.latencyMs,
            feedbackRating: greetingMessage.feedbackRating,
            feedbackText: greetingMessage.feedbackText,
            createdAt: greetingMessage.createdAt.toISOString(),
          },
        },
      });

      initialMessages.push({
        role: "assistant",
        content: chatbot.greetingMessage,
      });
      if (chatbot.workspace?.organizationId) {
        await recordAnalyticsEvent({
          organizationId: chatbot.workspace.organizationId,
          workspaceId: chatbot.workspace.id,
          chatbotId,
          conversationId: conversation.id,
          eventType: "message.sent",
          payload: {
            role: "assistant",
            source: "greeting",
            nodeId: null,
          },
        });
      }
    }

    return withChatApiCors(NextResponse.json({
      sessionId,
      conversationId: conversation.id,
      messages: initialMessages,
      chatbot: {
        name: chatbot.name,
        personaName: chatbot.personaName,
        widgetConfig: chatbot.widgetConfig,
      },
    }));
  } catch (error) {
    console.error("Error starting conversation:", error);
    return withChatApiCors(NextResponse.json(
      { error: "Failed to start conversation" },
      { status: 500 }
    ));
  }
}

export function OPTIONS(request: NextRequest) {
  return chatApiCorsPreflight(request);
}
