import { NextRequest, NextResponse } from "next/server";

/**
 * GET /embed/[chatbotId]/widget.js
 * Serves the embeddable chat widget script
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { chatbotId: string } }
) {
  const { chatbotId } = params;
  const host = request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}`;

  // The widget JavaScript code
  const widgetScript = `
(function() {
  // Prevent multiple initializations
  if (window.__chatWidgetLoaded) return;
  window.__chatWidgetLoaded = true;

  const CHATBOT_ID = "${chatbotId}";
  const BASE_URL = "${baseUrl}";
  const SESSION_KEY = "chatbot_session_" + CHATBOT_ID;

  // Default config
  const DEFAULT_CONFIG = {
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
    showPoweredBy: true
  };

  // State
  let state = {
    sessionId: null,
    conversationId: null,
    messages: [],
    isLoading: false,
    isOpen: false,
    chatbot: null,
    error: null,
    config: { ...DEFAULT_CONFIG, ...(window.chatbotConfig || {}) }
  };

  // Load saved session
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      state.sessionId = parsed.sessionId;
      state.conversationId = parsed.conversationId;
      state.messages = parsed.messages || [];
    }
  } catch (e) {
    console.error("Failed to load chat session:", e);
  }

  let liveEvents = null;

  function connectLiveEvents() {
    if (!state.sessionId) return;
    if (liveEvents) return;

    try {
      liveEvents = new EventSource(
        BASE_URL + "/api/chat/" + CHATBOT_ID + "/events?sessionId=" + encodeURIComponent(state.sessionId)
      );

      liveEvents.onmessage = function(event) {
        if (!event.data || event.data.trim() === "") return;
        try {
          const detail = JSON.parse(event.data);
          if (!detail || detail.type !== "conversation.message") return;
          const message = detail.payload && detail.payload.message;
          if (!message || message.role !== "assistant" || message.isFromAgent !== true) return;
          if (!message.id || !message.content) return;

          if (state.messages.some((m) => m && m.id === message.id)) {
            return;
          }

          state.messages.push({
            id: message.id,
            role: "assistant",
            content: message.content,
            timestamp: new Date(message.createdAt || Date.now()),
          });

          saveSession();
          if (state.isOpen) {
            renderMessages();
          }
        } catch (e) {}
      };

      liveEvents.onerror = function() {
        try { liveEvents.close(); } catch (e) {}
        liveEvents = null;
      };
    } catch (e) {
      liveEvents = null;
    }
  }

  // Save session
  function saveSession() {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        sessionId: state.sessionId,
        conversationId: state.conversationId,
        messages: state.messages.slice(-50)
      }));
    } catch (e) {
      console.error("Failed to save chat session:", e);
    }
  }

  // Create styles
  function createStyles() {
    const style = document.createElement("style");
    style.textContent = \`
      .chat-widget-container * {
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .chat-widget-bubble {
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .chat-widget-bubble:hover {
        transform: scale(1.05);
      }
      @keyframes typing-dot {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-4px); opacity: 1; }
      }
      .typing-dot {
        animation: typing-dot 1.4s infinite ease-in-out;
      }
      .chat-widget-messages::-webkit-scrollbar {
        width: 6px;
      }
      .chat-widget-messages::-webkit-scrollbar-track {
        background: transparent;
      }
      .chat-widget-messages::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 3px;
      }
    \`;
    document.head.appendChild(style);
  }

  // Create bubble button
  function createBubble() {
    const config = state.config;
    const bubble = document.createElement("button");
    bubble.className = "chat-widget-bubble";
    bubble.setAttribute("aria-label", "Open chat");
    bubble.style.cssText = \`
      width: \${config.bubbleSize}px;
      height: \${config.bubbleSize}px;
      background-color: \${config.primaryColor};
      border-radius: 50%;
      position: fixed;
      bottom: 20px;
      \${config.position === "bottom-right" ? "right" : "left"}: 20px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9998;
    \`;

    bubble.innerHTML = \`
      <svg width="\${config.bubbleSize * 0.4}" height="\${config.bubbleSize * 0.4}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    \`;

    bubble.onclick = toggleChat;
    return bubble;
  }

  // Create chat window
  function createWindow() {
    const config = state.config;
    const window = document.createElement("div");
    window.className = "chat-widget-window";
    window.style.cssText = \`
      position: fixed;
      bottom: 90px;
      \${config.position === "bottom-right" ? "right" : "left"}: 20px;
      width: 380px;
      height: 600px;
      max-height: calc(100vh - 120px);
      background-color: \${config.backgroundColor};
      border-radius: \${config.borderRadius}px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 9999;
    \`;

    window.innerHTML = \`
      <div style="background-color: \${config.primaryColor}; color: white; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background-color: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-weight: 600;">
            \${(state.chatbot?.personaName || config.headerTitle || "C")[0].toUpperCase()}
          </div>
          <div>
            <div style="font-weight: 600; font-size: 16px;">\${state.chatbot?.personaName || config.headerTitle}</div>
            \${config.headerSubtitle ? \`<div style="font-size: 12px; opacity: 0.9;">\${config.headerSubtitle}</div>\` : ""}
          </div>
        </div>
        <button onclick="window.__chatWidget.toggleChat()" style="background: rgba(255,255,255,0.2); border: none; border-radius: 6px; padding: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div class="chat-widget-messages" style="flex: 1; overflow-y: auto; padding: 16px;"></div>
      <form onsubmit="window.__chatWidget.handleSubmit(event)" style="padding: 12px 16px; border-top: 1px solid #e5e7eb;">
        <div style="display: flex; gap: 8px; align-items: center;">
          <input type="text" id="chat-widget-input" placeholder="Type a message..." style="flex: 1; padding: 10px 14px; border-radius: \${config.borderRadius}px; border: 1px solid #e5e7eb; font-size: 14px; outline: none;">
          <button type="submit" style="width: 40px; height: 40px; border-radius: \${config.borderRadius}px; border: none; background-color: \${config.primaryColor}; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </form>
      \${config.showPoweredBy ? \`<div style="padding: 8px 16px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #f3f4f6;">Powered by <strong>Chatbot Platform</strong></div>\` : ""}
    \`;

    return window;
  }

  // Render messages
  function renderMessages() {
    const container = document.querySelector(".chat-widget-messages");
    if (!container) return;

    const config = state.config;
    let html = "";

    state.messages.forEach((msg, i) => {
      const isUser = msg.role === "user";
      html += \`
        <div style="display: flex; flex-direction: column; align-items: \${isUser ? "flex-end" : "flex-start"}; margin-bottom: 12px;">
          <div style="max-width: 80%; padding: 10px 14px; border-radius: \${config.borderRadius}px; background-color: \${isUser ? config.primaryColor : config.secondaryColor}; color: \${isUser ? "white" : "#1f2937"}; font-size: 14px; line-height: 1.5; word-break: break-word; white-space: pre-wrap;">
            \${escapeHtml(msg.content)}
          </div>
          \${msg.buttons && msg.buttons.length ? \`
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; max-width: 80%;">
              \${msg.buttons.map((btn, j) => \`
                <button onclick="window.__chatWidget.sendMessage('\${escapeHtml(btn.value)}')" style="padding: 8px 16px; border-radius: \${config.borderRadius}px; border: 1px solid \${config.primaryColor}; background-color: white; color: \${config.primaryColor}; font-size: 13px; font-weight: 500; cursor: pointer;">
                  \${escapeHtml(btn.label)}
                </button>
              \`).join("")}
            </div>
          \` : ""}
        </div>
      \`;
    });

    if (state.isLoading) {
      html += \`
        <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
          <div style="padding: 12px 16px; border-radius: \${config.borderRadius}px; background-color: \${config.secondaryColor}; display: flex; gap: 4px;">
            <span class="typing-dot" style="width: 8px; height: 8px; border-radius: 50%; background-color: #9ca3af; animation-delay: 0s;"></span>
            <span class="typing-dot" style="width: 8px; height: 8px; border-radius: 50%; background-color: #9ca3af; animation-delay: 0.2s;"></span>
            <span class="typing-dot" style="width: 8px; height: 8px; border-radius: 50%; background-color: #9ca3af; animation-delay: 0.4s;"></span>
          </div>
        </div>
      \`;
    }

    if (state.error) {
      html += \`
        <div style="padding: 10px 14px; border-radius: \${config.borderRadius}px; background-color: #fef2f2; color: #dc2626; font-size: 13px; margin-bottom: 12px;">
          \${escapeHtml(state.error)}
        </div>
      \`;
    }

    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
  }

  // Escape HTML
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // Toggle chat
  function toggleChat() {
    state.isOpen = !state.isOpen;
    render();

    if (state.isOpen && !state.sessionId) {
      startConversation();
    }
  }

  // Start conversation
  async function startConversation() {
    state.isLoading = true;
    state.error = null;
    renderMessages();

    try {
      const response = await fetch(BASE_URL + "/api/chat/" + CHATBOT_ID + "/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start conversation");
      }

      const data = await response.json();
      state.sessionId = data.sessionId;
      state.conversationId = data.conversationId;
      state.chatbot = data.chatbot;
      state.messages = data.messages.map((m, i) => ({
        ...m,
        id: "msg_" + Date.now() + "_" + i,
        timestamp: new Date()
      }));

      if (data.chatbot?.widgetConfig) {
        state.config = { ...state.config, ...data.chatbot.widgetConfig };
      }

      saveSession();
      connectLiveEvents();
    } catch (e) {
      console.error("Start conversation error:", e);
      state.error = e.message || "Failed to start conversation";
    }

    state.isLoading = false;
    render();
  }

  // Send message
  async function sendMessage(content) {
    if (!content || state.isLoading) return;

    if (!state.sessionId) {
      await startConversation();
      return;
    }

    state.messages.push({
      id: "msg_" + Date.now(),
      role: "user",
      content: content,
      timestamp: new Date()
    });
    state.isLoading = true;
    state.error = null;
    renderMessages();

    try {
      const response = await fetch(BASE_URL + "/api/chat/" + CHATBOT_ID + "/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: state.sessionId,
          message: content
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send message");
      }

      const data = await response.json();
      data.messages.forEach((m, i) => {
        state.messages.push({
          ...m,
          id: "msg_" + Date.now() + "_" + i,
          timestamp: new Date()
        });
      });

      saveSession();
    } catch (e) {
      console.error("Send message error:", e);
      state.error = e.message || "Failed to send message";
    }

    state.isLoading = false;
    renderMessages();
  }

  // Handle form submit
  function handleSubmit(e) {
    e.preventDefault();
    const input = document.getElementById("chat-widget-input");
    if (input && input.value.trim()) {
      sendMessage(input.value.trim());
      input.value = "";
    }
  }

  // Render
  function render() {
    let container = document.querySelector(".chat-widget-container");

    if (!container) {
      container = document.createElement("div");
      container.className = "chat-widget-container";
      document.body.appendChild(container);
    }

    container.innerHTML = "";

    if (state.isOpen) {
      container.appendChild(createWindow());
      renderMessages();
    }

    const bubble = createBubble();
    if (state.isOpen) {
      bubble.innerHTML = \`
        <svg width="\${state.config.bubbleSize * 0.4}" height="\${state.config.bubbleSize * 0.4}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      \`;
    }
    container.appendChild(bubble);
  }

  // Initialize
  createStyles();
  render();
  connectLiveEvents();

  // Auto-open
  if (state.config.autoOpen && !state.sessionId) {
    setTimeout(toggleChat, state.config.autoOpenDelay);
  }

  // Expose API
  window.__chatWidget = {
    toggleChat: toggleChat,
    sendMessage: sendMessage,
    handleSubmit: handleSubmit
  };
})();
`;

  return new NextResponse(widgetScript, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
