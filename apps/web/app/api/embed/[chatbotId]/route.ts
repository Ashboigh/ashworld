import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/embed/[chatbotId]
 * Serves the embeddable chat widget script
 * Public endpoint - no authentication required (under /api/ so middleware is bypassed)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { chatbotId: string } }
) {
  const { chatbotId } = params;
  const host = request.headers.get("host") || "localhost:3000";
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}`;

  const widgetScript = `
(function() {
  if (window.__chatWidgetLoaded) return;
  window.__chatWidgetLoaded = true;

  var CHATBOT_ID = "${chatbotId}";
  var BASE_URL = "${baseUrl}";
  var SESSION_KEY = "chatbot_session_" + CHATBOT_ID;

  var DEFAULT_CONFIG = {
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

  var state = {
    sessionId: null,
    conversationId: null,
    messages: [],
    isLoading: false,
    isOpen: false,
    chatbot: null,
    error: null,
    config: Object.assign({}, DEFAULT_CONFIG, window.chatbotConfig || {})
  };

  try {
    var saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      var parsed = JSON.parse(saved);
      state.sessionId = parsed.sessionId;
      state.conversationId = parsed.conversationId;
      state.messages = parsed.messages || [];
    }
  } catch (e) {}

  var liveEvents = null;

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
          var detail = JSON.parse(event.data);
          if (!detail || detail.type !== "conversation.message") return;
          var message = detail.payload && detail.payload.message;
          if (!message || message.role !== "assistant" || message.isFromAgent !== true) return;
          if (!message.id || !message.content) return;

          for (var i = 0; i < state.messages.length; i++) {
            if (state.messages[i] && state.messages[i].id === message.id) {
              return;
            }
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

  function saveSession() {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        sessionId: state.sessionId,
        conversationId: state.conversationId,
        messages: state.messages.slice(-50)
      }));
    } catch (e) {}
  }

  function injectStyles() {
    var style = document.createElement("style");
    style.textContent = [
      ".chat-widget-container * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }",
      ".chat-widget-bubble { transition: transform 0.2s, box-shadow 0.2s; }",
      ".chat-widget-bubble:hover { transform: scale(1.05); }",
      "@keyframes typing-dot { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-4px); opacity: 1; } }",
      ".typing-dot { animation: typing-dot 1.4s infinite ease-in-out; }",
      ".chat-widget-messages::-webkit-scrollbar { width: 6px; }",
      ".chat-widget-messages::-webkit-scrollbar-track { background: transparent; }",
      ".chat-widget-messages::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }"
    ].join("\\n");
    document.head.appendChild(style);
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function createBubble() {
    var c = state.config;
    var btn = document.createElement("button");
    btn.className = "chat-widget-bubble";
    btn.setAttribute("aria-label", "Open chat");
    btn.style.cssText = "width:" + c.bubbleSize + "px;height:" + c.bubbleSize + "px;background-color:" + c.primaryColor + ";border-radius:50%;position:fixed;bottom:20px;" + (c.position === "bottom-right" ? "right" : "left") + ":20px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:9998;";

    var iconSize = Math.round(c.bubbleSize * 0.4);
    if (state.isOpen) {
      btn.innerHTML = '<svg width="' + iconSize + '" height="' + iconSize + '" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    } else {
      btn.innerHTML = '<svg width="' + iconSize + '" height="' + iconSize + '" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    }

    btn.onclick = toggleChat;
    return btn;
  }

  function createChatWindow() {
    var c = state.config;
    var el = document.createElement("div");
    el.className = "chat-widget-window";
    el.style.cssText = "position:fixed;bottom:90px;" + (c.position === "bottom-right" ? "right" : "left") + ":20px;width:380px;height:600px;max-height:calc(100vh - 120px);background-color:" + c.backgroundColor + ";border-radius:" + c.borderRadius + "px;box-shadow:0 10px 40px rgba(0,0,0,0.15);display:flex;flex-direction:column;overflow:hidden;z-index:9999;";

    var title = (state.chatbot && state.chatbot.personaName) || c.headerTitle || "Chat";
    var initial = title.charAt(0).toUpperCase();

    var headerHtml = '<div style="background-color:' + c.primaryColor + ';color:white;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;">' +
      '<div style="display:flex;align-items:center;gap:12px;">' +
      '<div style="width:40px;height:40px;border-radius:50%;background-color:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-weight:600;">' + initial + '</div>' +
      '<div><div style="font-weight:600;font-size:16px;">' + escapeHtml(title) + '</div>' +
      (c.headerSubtitle ? '<div style="font-size:12px;opacity:0.9;">' + escapeHtml(c.headerSubtitle) + '</div>' : '') +
      '</div></div>' +
      '<button id="chat-widget-close" style="background:rgba(255,255,255,0.2);border:none;border-radius:6px;padding:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
      '</button></div>';

    var messagesHtml = '<div class="chat-widget-messages" style="flex:1;overflow-y:auto;padding:16px;"></div>';

    var formHtml = '<form id="chat-widget-form" style="padding:12px 16px;border-top:1px solid #e5e7eb;">' +
      '<div style="display:flex;gap:8px;align-items:center;">' +
      '<input type="text" id="chat-widget-input" placeholder="Type a message..." style="flex:1;padding:10px 14px;border-radius:' + c.borderRadius + 'px;border:1px solid #e5e7eb;font-size:14px;outline:none;">' +
      '<button type="submit" style="width:40px;height:40px;border-radius:' + c.borderRadius + 'px;border:none;background-color:' + c.primaryColor + ';color:white;cursor:pointer;display:flex;align-items:center;justify-content:center;">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>' +
      '</button></div></form>';

    var poweredBy = c.showPoweredBy ? '<div style="padding:8px 16px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;">Powered by <strong>ChatBot Pro</strong></div>' : '';

    el.innerHTML = headerHtml + messagesHtml + formHtml + poweredBy;

    // Attach event listeners after innerHTML is set
    setTimeout(function() {
      var closeBtn = document.getElementById("chat-widget-close");
      if (closeBtn) closeBtn.onclick = toggleChat;

      var form = document.getElementById("chat-widget-form");
      if (form) form.onsubmit = handleSubmit;
    }, 0);

    return el;
  }

  function renderMessages() {
    var container = document.querySelector(".chat-widget-messages");
    if (!container) return;

    var c = state.config;
    var html = "";

    for (var i = 0; i < state.messages.length; i++) {
      var msg = state.messages[i];
      var isUser = msg.role === "user";
      html += '<div style="display:flex;flex-direction:column;align-items:' + (isUser ? "flex-end" : "flex-start") + ';margin-bottom:12px;">' +
        '<div style="max-width:80%;padding:10px 14px;border-radius:' + c.borderRadius + 'px;background-color:' + (isUser ? c.primaryColor : c.secondaryColor) + ';color:' + (isUser ? "white" : "#1f2937") + ';font-size:14px;line-height:1.5;word-break:break-word;white-space:pre-wrap;">' +
        escapeHtml(msg.content) + '</div>';

      if (msg.buttons && msg.buttons.length) {
        html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;max-width:80%;">';
        for (var j = 0; j < msg.buttons.length; j++) {
          var b = msg.buttons[j];
          html += '<button data-value="' + escapeHtml(b.value) + '" class="chat-widget-option-btn" style="padding:8px 16px;border-radius:' + c.borderRadius + 'px;border:1px solid ' + c.primaryColor + ';background-color:white;color:' + c.primaryColor + ';font-size:13px;font-weight:500;cursor:pointer;">' + escapeHtml(b.label) + '</button>';
        }
        html += '</div>';
      }

      html += '</div>';
    }

    if (state.isLoading) {
      html += '<div style="display:flex;align-items:flex-start;margin-bottom:12px;">' +
        '<div style="padding:12px 16px;border-radius:' + c.borderRadius + 'px;background-color:' + c.secondaryColor + ';display:flex;gap:4px;">' +
        '<span class="typing-dot" style="width:8px;height:8px;border-radius:50%;background-color:#9ca3af;animation-delay:0s;display:inline-block;"></span>' +
        '<span class="typing-dot" style="width:8px;height:8px;border-radius:50%;background-color:#9ca3af;animation-delay:0.2s;display:inline-block;"></span>' +
        '<span class="typing-dot" style="width:8px;height:8px;border-radius:50%;background-color:#9ca3af;animation-delay:0.4s;display:inline-block;"></span>' +
        '</div></div>';
    }

    if (state.error) {
      html += '<div style="padding:10px 14px;border-radius:' + c.borderRadius + 'px;background-color:#fef2f2;color:#dc2626;font-size:13px;margin-bottom:12px;">' +
        escapeHtml(state.error) + '</div>';
    }

    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;

    // Attach click handlers to option buttons
    var optionBtns = container.querySelectorAll(".chat-widget-option-btn");
    for (var k = 0; k < optionBtns.length; k++) {
      (function(btn) {
        btn.onclick = function() {
          sendMessage(btn.getAttribute("data-value"));
        };
      })(optionBtns[k]);
    }
  }

  function toggleChat() {
    state.isOpen = !state.isOpen;
    render();
    if (state.isOpen && !state.sessionId) {
      startConversation();
    }
  }

  function startConversation() {
    state.isLoading = true;
    state.error = null;
    renderMessages();

    fetch(BASE_URL + "/api/chat/" + CHATBOT_ID + "/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    })
    .then(function(res) {
      if (!res.ok) return res.json().then(function(e) { throw new Error(e.error || "Failed to start"); });
      return res.json();
    })
    .then(function(data) {
      state.sessionId = data.sessionId;
      state.conversationId = data.conversationId;
      state.chatbot = data.chatbot;
      state.messages = [];
      for (var i = 0; i < data.messages.length; i++) {
        var m = data.messages[i];
        state.messages.push({ id: "msg_" + Date.now() + "_" + i, role: m.role, content: m.content, buttons: m.buttons, timestamp: new Date() });
      }
      if (data.chatbot && data.chatbot.widgetConfig) {
        state.config = Object.assign({}, state.config, data.chatbot.widgetConfig);
      }
      saveSession();
      connectLiveEvents();
      state.isLoading = false;
      render();
    })
    .catch(function(e) {
      state.error = e.message || "Failed to start conversation";
      state.isLoading = false;
      renderMessages();
    });
  }

  function sendMessage(content) {
    if (!content || state.isLoading) return;
    if (!state.sessionId) { startConversation(); return; }

    state.messages.push({ id: "msg_" + Date.now(), role: "user", content: content, timestamp: new Date() });
    state.isLoading = true;
    state.error = null;
    renderMessages();

    fetch(BASE_URL + "/api/chat/" + CHATBOT_ID + "/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: state.sessionId, message: content })
    })
    .then(function(res) {
      if (!res.ok) return res.json().then(function(e) { throw new Error(e.error || "Failed to send"); });
      return res.json();
    })
    .then(function(data) {
      for (var i = 0; i < data.messages.length; i++) {
        var m = data.messages[i];
        state.messages.push({ id: "msg_" + Date.now() + "_" + i, role: m.role, content: m.content, buttons: m.buttons, timestamp: new Date() });
      }
      saveSession();
      state.isLoading = false;
      renderMessages();
    })
    .catch(function(e) {
      state.error = e.message || "Failed to send message";
      state.isLoading = false;
      renderMessages();
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    var input = document.getElementById("chat-widget-input");
    if (input && input.value.trim()) {
      sendMessage(input.value.trim());
      input.value = "";
    }
  }

  function render() {
    var container = document.querySelector(".chat-widget-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "chat-widget-container";
      document.body.appendChild(container);
    }
    container.innerHTML = "";

    if (state.isOpen) {
      container.appendChild(createChatWindow());
      renderMessages();
    }
    container.appendChild(createBubble());
  }

  // Initialize
  injectStyles();
  render();
  connectLiveEvents();

  if (state.config.autoOpen && !state.sessionId) {
    setTimeout(toggleChat, state.config.autoOpenDelay);
  }

  window.__chatWidget = {
    toggleChat: toggleChat,
    sendMessage: sendMessage,
    handleSubmit: handleSubmit
  };
})();
`;

  return new NextResponse(widgetScript, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}
