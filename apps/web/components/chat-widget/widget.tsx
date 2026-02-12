"use client";

import { useState, useEffect, useCallback } from "react";
import { ChatBubble } from "./chat-bubble";
import { ChatWindow } from "./chat-window";
import type { ChatState, ChatMessage, WidgetConfig } from "./types";

interface WidgetProps {
  chatbotId: string;
  baseUrl: string;
  initialConfig?: Partial<WidgetConfig>;
}

const SESSION_KEY = "chatbot_session";

export function Widget({ chatbotId, baseUrl, initialConfig }: WidgetProps) {
  const [state, setState] = useState<ChatState>({
    sessionId: null,
    conversationId: null,
    messages: [],
    isLoading: false,
    isOpen: false,
    chatbot: null,
    error: null,
  });

  // Load session from localStorage
  useEffect(() => {
    const savedSession = localStorage.getItem(`${SESSION_KEY}_${chatbotId}`);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setState((prev) => ({
          ...prev,
          sessionId: parsed.sessionId,
          conversationId: parsed.conversationId,
          messages: parsed.messages || [],
        }));
      } catch (e) {
        console.error("Failed to parse saved session:", e);
      }
    }
  }, [chatbotId]);

  // Save session to localStorage
  useEffect(() => {
    if (state.sessionId) {
      localStorage.setItem(
        `${SESSION_KEY}_${chatbotId}`,
        JSON.stringify({
          sessionId: state.sessionId,
          conversationId: state.conversationId,
          messages: state.messages.slice(-50), // Keep last 50 messages
        })
      );
    }
  }, [chatbotId, state.sessionId, state.conversationId, state.messages]);

  // Listen for agent replies (SSE)
  useEffect(() => {
    if (!state.sessionId) return undefined;

    const url = `${baseUrl}/api/chat/${chatbotId}/events?sessionId=${encodeURIComponent(
      state.sessionId
    )}`;

    const events = new EventSource(url);

    events.onmessage = (event: MessageEvent) => {
      if (!event.data || event.data.trim() === "") return;

      try {
        const detail = JSON.parse(event.data) as {
          type?: string;
          payload?: Record<string, unknown>;
        };

        if (detail.type !== "conversation.message") return;

        const payload = (detail.payload ?? {}) as {
          message?: {
            id?: string;
            role?: string;
            content?: string;
            createdAt?: string;
            isFromAgent?: boolean;
          };
        };

        const message = payload.message;
        if (
          !message ||
          message.role !== "assistant" ||
          message.isFromAgent !== true ||
          typeof message.content !== "string" ||
          typeof message.id !== "string"
        ) {
          return;
        }

        const agentMessage: ChatMessage = {
          id: message.id,
          role: "assistant",
          content: message.content,
          timestamp: message.createdAt ? new Date(message.createdAt) : new Date(),
        };

        setState((prev) => {
          if (prev.messages.some((m) => m.id && m.id === agentMessage.id)) {
            return prev;
          }
          return { ...prev, messages: [...prev.messages, agentMessage] };
        });
      } catch (error) {
        console.warn("Widget event parse failed", error);
      }
    };

    events.onerror = () => {
      events.close();
    };

    return () => events.close();
  }, [baseUrl, chatbotId, state.sessionId]);

  // Start conversation
  const startConversation = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${baseUrl}/api/chat/${chatbotId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start conversation");
      }

      const data = await response.json();

      const messages: ChatMessage[] = data.messages.map((m: ChatMessage, i: number) => ({
        ...m,
        id: m.id ?? `msg_${Date.now()}_${i}`,
        timestamp: new Date(),
      }));

      setState((prev) => ({
        ...prev,
        sessionId: data.sessionId,
        conversationId: data.conversationId,
        messages,
        chatbot: data.chatbot,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Start conversation error:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to start conversation",
      }));
    }
  }, [baseUrl, chatbotId]);

  // Send message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!state.sessionId) {
        // Start new conversation first
        await startConversation();
        return;
      }

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        isLoading: true,
        error: null,
      }));

      try {
        const response = await fetch(`${baseUrl}/api/chat/${chatbotId}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: state.sessionId,
            message: content,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to send message");
        }

        const data = await response.json();

        const assistantMessages: ChatMessage[] = data.messages.map(
          (m: ChatMessage, i: number) => ({
            ...m,
            id: m.id ?? `msg_${Date.now()}_${i}`,
            timestamp: new Date(),
          })
        );

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, ...assistantMessages],
          isLoading: false,
        }));
      } catch (error) {
        console.error("Send message error:", error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : "Failed to send message",
        }));
      }
    },
    [baseUrl, chatbotId, state.sessionId, startConversation]
  );

  // Toggle chat window
  const toggleChat = useCallback(() => {
    setState((prev) => {
      const newIsOpen = !prev.isOpen;

      // Start conversation when opening for the first time
      if (newIsOpen && !prev.sessionId) {
        startConversation();
      }

      return { ...prev, isOpen: newIsOpen };
    });
  }, [startConversation]);

  // Get widget config
  const config: WidgetConfig = {
    primaryColor: "#6366f1",
    backgroundColor: "#ffffff",
    secondaryColor: "#f3f4f6",
    position: "bottom-right",
    borderRadius: 12,
    headerTitle: "Chat with us",
    headerSubtitle: "We typically reply in minutes",
    bubbleIcon: "chat",
    bubbleSize: 60,
    autoOpen: false,
    autoOpenDelay: 5000,
    showPoweredBy: true,
    ...initialConfig,
    ...(state.chatbot?.widgetConfig || {}),
  };

  // Auto-open handling
  useEffect(() => {
    if (config.autoOpen && !state.isOpen && !state.sessionId) {
      const timer = setTimeout(() => {
        toggleChat();
      }, config.autoOpenDelay);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [config.autoOpen, config.autoOpenDelay, state.isOpen, state.sessionId, toggleChat]);

  return (
    <>
      {state.isOpen && (
        <ChatWindow
          config={config}
          chatbot={state.chatbot}
          messages={state.messages}
          isLoading={state.isLoading}
          onSendMessage={sendMessage}
          onClose={toggleChat}
          error={state.error}
        />
      )}
      <ChatBubble
        config={config}
        isOpen={state.isOpen}
        onClick={toggleChat}
      />
    </>
  );
}
