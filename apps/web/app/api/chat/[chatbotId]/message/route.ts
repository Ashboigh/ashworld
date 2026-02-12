import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { chatApiCorsPreflight, withChatApiCors } from "@/lib/network/cors";

// Infer Message type from Prisma query result
type PrismaMessage = NonNullable<Awaited<ReturnType<typeof prisma.message.findFirst>>>;
import { z } from "zod";
import { createWorkflowExecutor, ExecutionContext } from "@/lib/workflow-executor";
import { getLLMClient } from "@/lib/workflow-executor/llm-client";
import { checkMessageLimit, incrementMessageUsage } from "@/lib/billing";
import { emitLiveChatEvent } from "@/lib/live-chat/events";
import { recordAnalyticsEvent } from "@/lib/analytics/events";
import { recordCostUsage, estimateTokenCost } from "@/lib/ai-optimization/cost";

const sendMessageSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(4000),
});

const formatMessageForEvent = (message: PrismaMessage) => ({
  id: message.id,
  role: message.role,
  content: message.content,
  nodeId: message.nodeId,
  aiModel: message.aiModel,
  tokenCount: message.tokenCount,
  latencyMs: message.latencyMs,
  feedbackRating: message.feedbackRating,
  feedbackText: message.feedbackText,
  createdAt: message.createdAt.toISOString(),
});

type MetadataWithUsage = {
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  provider?: string;
  aiModel?: string;
};

async function logCostFromMetadata(
  metadata: MetadataWithUsage | undefined,
  chatbot: { id: string; aiProvider: string; aiModel: string; workspaceId: string; organizationId: string },
  conversationId: string
) {
  const usage = metadata?.usage;
  if (!usage?.totalTokens) return;

  const cost = estimateTokenCost(chatbot.aiProvider, usage);
  await recordCostUsage({
    organizationId: chatbot.organizationId,
    chatbotId: chatbot.id,
    conversationId,
    provider: metadata?.provider ?? chatbot.aiProvider,
    model: metadata?.aiModel ?? chatbot.aiModel,
    promptTokens: usage.promptTokens ?? 0,
    completionTokens: usage.completionTokens ?? 0,
    totalTokens: usage.totalTokens,
    costUsd: cost,
  });
}

/**
 * POST /api/chat/[chatbotId]/message
 * Send a message to the chatbot and get a response
 * Public endpoint - no authentication required
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params;
    const body = await request.json();

    // Validate input
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return withChatApiCors(NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      ));
    }

    const { sessionId, message } = parsed.data;

    // Get chatbot with workspace and organization
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: {
        workspace: {
          select: { id: true, organizationId: true },
        },
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

    const workspaceMeta = chatbot.workspace;
    if (!workspaceMeta?.organizationId) {
      return withChatApiCors(NextResponse.json(
        { error: "Chatbot workspace configuration incomplete" },
        { status: 500 }
      ));
    }

    const chatbotMeta = {
      id: chatbot.id,
      aiProvider: chatbot.aiProvider,
      aiModel: chatbot.aiModel,
      workspaceId: workspaceMeta.id,
      organizationId: workspaceMeta.organizationId,
    };

    // Check message limit before processing
    const messageLimitCheck = await checkMessageLimit(workspaceMeta.organizationId);
    if (!messageLimitCheck.allowed) {
      return withChatApiCors(NextResponse.json(
        {
          error: "Message limit reached",
          code: "LIMIT_EXCEEDED",
          details: {
            resource: "messages",
            current: messageLimitCheck.used,
            limit: messageLimitCheck.limit,
            remaining: messageLimitCheck.remaining,
          },
        },
        { status: 429 }
      ));
    }

    // Get conversation
    const conversation = await prisma.conversation.findUnique({
      where: { sessionId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 50, // Last 50 messages for context
        },
      },
    });

    if (!conversation) {
      return withChatApiCors(NextResponse.json(
        { error: "Conversation not found. Please start a new conversation." },
        { status: 404 }
      ));
    }

    if (conversation.chatbotId !== chatbotId) {
      return withChatApiCors(NextResponse.json(
        { error: "Session does not belong to this chatbot" },
        { status: 400 }
      ));
    }

    if (conversation.status === "closed") {
      return withChatApiCors(NextResponse.json(
        { error: "This conversation has been closed" },
        { status: 400 }
      ));
    }

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
        metadata: {},
      },
    });

    emitLiveChatEvent({
      type: "conversation.message",
      payload: {
        organizationId: chatbotMeta.organizationId,
        conversationId: conversation.id,
        message: formatMessageForEvent(userMessage),
      },
    });

    if (chatbotMeta) {
      await recordAnalyticsEvent({
        organizationId: chatbotMeta.organizationId,
        workspaceId: chatbotMeta.workspaceId,
        chatbotId: chatbotMeta.id,
        conversationId: conversation.id,
        eventType: "message.sent",
        payload: {
          role: "user",
          length: message.length,
          messageId: userMessage.id,
        },
      });

      // Increment message usage for the organization
      await incrementMessageUsage(chatbotMeta.organizationId);
    } else {
      throw new Error("Workspace metadata missing for chatbot");
    }

    // Update last message time
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    // Prepare response messages
    const responseMessages: Array<{
      role: string;
      content: string;
      type?: string;
      buttons?: Array<{ label: string; value: string }>;
    }> = [];

    // Check if conversation is waiting for human
    if (conversation.status === "waiting_for_human" || conversation.status === "handed_off") {
      return withChatApiCors(NextResponse.json({
        messages: [{
          role: "assistant",
          content: "Your message has been received. A human agent will respond shortly.",
        }],
        status: conversation.status,
      }));
    }

    // If chatbot has a workflow, use workflow execution
    if (conversation.workflowId) {
      const workflow = await prisma.workflow.findUnique({
        where: { id: conversation.workflowId },
        include: {
          nodes: true,
          edges: true,
        },
      });

      if (workflow) {
        try {
          const executor = await createWorkflowExecutor(
            {
              nodes: workflow.nodes,
              edges: workflow.edges,
            },
            chatbot
          );

          // Restore context from conversation
          const savedContext = conversation.context as Record<string, unknown>;
          const context: ExecutionContext = {
            conversationId: conversation.id,
            sessionId,
            chatbotId,
            workflowId: workflow.id,
            currentNodeId: conversation.currentNodeId,
            variables: (savedContext?.variables as Record<string, unknown>) || {},
            messages: conversation.messages.map((m) => ({
              role: m.role as "user" | "assistant" | "system",
              content: m.content,
              timestamp: m.createdAt.getTime(),
              nodeId: m.nodeId || undefined,
            })),
            executionHistory: [],
            awaitingInput: (savedContext?.awaitingInput as boolean) || false,
            awaitingInputConfig: savedContext?.awaitingInputConfig as ExecutionContext["awaitingInputConfig"],
          };

          const { results, context: newContext } = await executor.processMessage(
            message,
            context
          );

          // Save execution state
          const nextStatus = newContext.variables._conversationStatus as string | undefined;
          const updateData: Record<string, unknown> = {
            currentNodeId: newContext.currentNodeId,
            context: {
              variables: newContext.variables,
              awaitingInput: newContext.awaitingInput,
              awaitingInputConfig: newContext.awaitingInputConfig,
            },
          };

          // Check for status change (e.g., handoff)
          if (nextStatus) {
            updateData.status = newContext.variables._conversationStatus;
          }

          await prisma.conversation.update({
            where: { id: conversation.id },
            data: updateData,
          });

            if (nextStatus && nextStatus !== conversation.status) {
              emitLiveChatEvent({
                type: "conversation.status",
                payload: {
                  organizationId: chatbotMeta.organizationId,
                  conversationId: conversation.id,
                  status: nextStatus,
                },
              });
              if (chatbotMeta) {
                const durationMs = Date.now() - new Date(conversation.createdAt).getTime();
                const basePayload = {
                  status: nextStatus,
                  durationMs,
                };

                if (nextStatus === "waiting_for_human" || nextStatus === "handed_off") {
                  await recordAnalyticsEvent({
                    organizationId: chatbotMeta.organizationId,
                    workspaceId: chatbotMeta.workspaceId,
                    chatbotId: chatbotMeta.id,
                    conversationId: conversation.id,
                    eventType: "conversation.handoff",
                    payload: basePayload,
                  });
                }

                if (nextStatus === "closed") {
                  await recordAnalyticsEvent({
                    organizationId: chatbotMeta.organizationId,
                    workspaceId: chatbotMeta.workspaceId,
                    chatbotId: chatbotMeta.id,
                    conversationId: conversation.id,
                    eventType: "conversation.resolved",
                    payload: basePayload,
                  });
                  await recordAnalyticsEvent({
                    organizationId: chatbotMeta.organizationId,
                    workspaceId: chatbotMeta.workspaceId,
                    chatbotId: chatbotMeta.id,
                    conversationId: conversation.id,
                    eventType: "conversation.ended",
                    payload: basePayload,
                  });
                }
              }
            }

          // Save and collect response messages
          for (const result of results) {
            if (chatbotMeta) {
              await recordAnalyticsEvent({
                organizationId: chatbotMeta.organizationId,
                workspaceId: chatbotMeta.workspaceId,
                chatbotId: chatbotMeta.id,
                conversationId: conversation.id,
                eventType: "workflow.node.executed",
                payload: {
                  nodeId: result.nodeId,
                },
              });
            }
            if (result.response?.content) {
              const assistantMessage = await prisma.message.create({
                data: {
                  conversationId: conversation.id,
                  role: "assistant",
                  content: result.response.content,
                  nodeId: result.nodeId,
                  aiModel: result.response.metadata?.aiModel as string | undefined,
                  tokenCount: result.response.metadata?.tokenCount as number | undefined,
                  latencyMs: result.response.metadata?.latencyMs as number | undefined,
                  metadata: result.response.metadata ? JSON.parse(JSON.stringify(result.response.metadata)) : {},
                },
              });

              emitLiveChatEvent({
                type: "conversation.message",
                payload: {
                  organizationId: chatbotMeta.organizationId,
                  conversationId: conversation.id,
                  message: formatMessageForEvent(assistantMessage),
                },
              });

              responseMessages.push({
                role: "assistant",
                content: result.response.content,
                type: result.response.type,
                buttons: result.response.buttons,
              });
              if (chatbotMeta) {
                await recordAnalyticsEvent({
                  organizationId: chatbotMeta.organizationId,
                  workspaceId: chatbotMeta.workspaceId,
                  chatbotId: chatbotMeta.id,
                  conversationId: conversation.id,
                  eventType: "message.sent",
                  payload: {
                    role: "assistant",
                    nodeId: result.nodeId,
                    source: "workflow",
                  },
                });
              }
              if (chatbotMeta) {
                await logCostFromMetadata(
                  result.response?.metadata as MetadataWithUsage | undefined,
                  chatbotMeta,
                  conversation.id
                );
              }
            }
          }

          return withChatApiCors(NextResponse.json({
            messages: responseMessages,
            status: newContext.variables._conversationStatus || conversation.status,
          }));
        } catch (error) {
          console.error("Workflow execution error:", error);
          // Fall through to AI-only mode
        }
      }
    }

    // AI-only mode (no workflow or workflow failed)
    try {
      const llmClient = getLLMClient(chatbot.aiProvider, chatbot.aiModel);

      // Build messages for LLM
      const llmMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

      // Add system prompt
      if (chatbot.personaInstructions) {
        llmMessages.push({
          role: "system",
          content: chatbot.personaInstructions,
        });
      }

      // Add conversation history
      for (const msg of conversation.messages.slice(-20)) {
        if (msg.role === "user" || msg.role === "assistant") {
          llmMessages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }

      // Add current message
      llmMessages.push({
        role: "user",
        content: message,
      });

      const startTime = Date.now();
      const response = await llmClient.generateResponse(llmMessages, {
        temperature: chatbot.aiTemperature,
        maxTokens: chatbot.aiMaxTokens,
      });
      const latencyMs = Date.now() - startTime;

      // Save assistant message
      const aiMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          content: response.content,
          aiModel: chatbot.aiModel,
          tokenCount: response.tokenCount,
          latencyMs,
          metadata: {},
        },
      });

      emitLiveChatEvent({
        type: "conversation.message",
        payload: {
          organizationId: chatbotMeta.organizationId,
          conversationId: conversation.id,
          message: formatMessageForEvent(aiMessage),
        },
      });

      if (chatbotMeta) {
        await recordAnalyticsEvent({
          organizationId: chatbotMeta.organizationId,
          workspaceId: chatbotMeta.workspaceId,
          chatbotId: chatbotMeta.id,
          conversationId: conversation.id,
          eventType: "message.sent",
          payload: {
            role: "assistant",
            source: "llm",
            length: response.content.length,
          },
        });
        await logCostFromMetadata(
          { usage: response.usage, provider: chatbot.aiProvider, aiModel: chatbot.aiModel },
          chatbotMeta,
          conversation.id
        );
      }

      return withChatApiCors(NextResponse.json({
        messages: [{
          role: "assistant",
          content: response.content,
        }],
        status: conversation.status,
      }));
    } catch (error) {
      console.error("AI response error:", error);

      // Return fallback message
      const fallbackMessage = chatbot.fallbackMessage ||
        "I apologize, but I'm having trouble processing your request. Please try again.";

      const fallbackCreated = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          content: fallbackMessage,
          metadata: { error: true },
        },
      });

      emitLiveChatEvent({
        type: "conversation.message",
        payload: {
          organizationId: chatbotMeta.organizationId,
          conversationId: conversation.id,
          message: formatMessageForEvent(fallbackCreated),
        },
      });

      if (chatbotMeta) {
        await recordAnalyticsEvent({
          organizationId: chatbotMeta.organizationId,
          workspaceId: chatbotMeta.workspaceId,
          chatbotId: chatbotMeta.id,
          conversationId: conversation.id,
          eventType: "message.sent",
          payload: {
            role: "assistant",
            source: "fallback",
          },
        });
      }

      return withChatApiCors(NextResponse.json({
        messages: [{
          role: "assistant",
          content: fallbackMessage,
        }],
        status: conversation.status,
      }));
    }
  } catch (error) {
    console.error("Error processing message:", error);
    return withChatApiCors(NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    ));
  }
}

export function OPTIONS(request: NextRequest) {
  return chatApiCorsPreflight(request);
}
