"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import type { ChatMessage, WidgetConfig, ChatbotInfo } from "./types";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";

interface ChatWindowProps {
  config: WidgetConfig;
  chatbot: ChatbotInfo | null;
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onClose: () => void;
  error: string | null;
  embedded?: boolean;
  style?: CSSProperties;
}

export function ChatWindow({
  config,
  chatbot,
  messages,
  isLoading,
  onSendMessage,
  onClose,
  error,
  embedded = false,
  style,
}: ChatWindowProps) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when window opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue("");
    }
  };

  const handleButtonClick = (value: string) => {
    if (!isLoading) {
      onSendMessage(value);
    }
  };

  const windowWidth = 380;
  const windowHeight = 600;

  const fixedStyle: CSSProperties = {
    position: "fixed",
    bottom: 90,
    [config.position === "bottom-right" ? "right" : "left"]: 20,
    width: windowWidth,
    height: windowHeight,
    maxHeight: "calc(100vh - 120px)",
    backgroundColor: config.backgroundColor,
    borderRadius: config.borderRadius,
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 9999,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  };

  const embeddedStyle: CSSProperties = {
    position: "relative",
    bottom: undefined,
    right: undefined,
    left: undefined,
    width: "100%",
    maxWidth: windowWidth,
    height: "100%",
    maxHeight: windowHeight,
    backgroundColor: config.backgroundColor,
    borderRadius: config.borderRadius,
    boxShadow: "0 15px 45px rgba(15, 23, 42, 0.25)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  };

  const combinedStyle = embedded
    ? { ...embeddedStyle, ...style }
    : { ...fixedStyle, ...style };

  return (
    <div className="chat-widget-window" style={combinedStyle}>
      {/* Header */}
      <div
        style={{
          backgroundColor: config.primaryColor,
          color: "white",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {config.logoUrl ? (
            <img
              src={config.logoUrl}
              alt={config.companyName || "Logo"}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              {(chatbot?.personaName || config.headerTitle || "C")
                .charAt(0)
                .toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>
              {chatbot?.personaName || config.headerTitle}
            </div>
            {config.headerSubtitle && (
              <div style={{ fontSize: 12, opacity: 0.9 }}>
                {config.headerSubtitle}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              borderRadius: 6,
              padding: 6,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Close chat"
          >
            <X size={18} color="white" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 16,
          backgroundColor: config.backgroundColor,
        }}
      >
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id || index}
            message={message}
            config={config}
            onButtonClick={handleButtonClick}
          />
        ))}
        {isLoading && <TypingIndicator config={config} />}
        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: config.borderRadius,
              backgroundColor: "#fef2f2",
              color: "#dc2626",
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: "12px 16px",
          borderTop: "1px solid #e5e7eb",
          backgroundColor: config.backgroundColor,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: config.borderRadius,
              border: "1px solid #e5e7eb",
              fontSize: 14,
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = config.primaryColor;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#e5e7eb";
            }}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            style={{
              width: 40,
              height: 40,
              borderRadius: config.borderRadius,
              border: "none",
              backgroundColor:
                inputValue.trim() && !isLoading
                  ? config.primaryColor
                  : "#e5e7eb",
              color: inputValue.trim() && !isLoading ? "white" : "#9ca3af",
              cursor:
                inputValue.trim() && !isLoading ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
            }}
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </div>
      </form>

      {/* Powered by footer */}
      {config.showPoweredBy && (
        <div
          style={{
            padding: "8px 16px",
            textAlign: "center",
            fontSize: 11,
            color: "#9ca3af",
            backgroundColor: config.backgroundColor,
            borderTop: "1px solid #f3f4f6",
          }}
        >
          Powered by <strong>Chatbot Platform</strong>
        </div>
      )}
    </div>
  );
}
