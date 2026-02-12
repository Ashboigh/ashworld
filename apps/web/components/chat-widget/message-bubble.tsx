"use client";

import type { ChatMessage, WidgetConfig } from "./types";

interface MessageBubbleProps {
  message: ChatMessage;
  config: WidgetConfig;
  onButtonClick?: (value: string) => void;
}

export function MessageBubble({ message, config, onButtonClick }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          maxWidth: "80%",
          padding: "10px 14px",
          borderRadius: config.borderRadius,
          backgroundColor: isUser ? config.primaryColor : config.secondaryColor,
          color: isUser ? "white" : "#1f2937",
          fontSize: 14,
          lineHeight: 1.5,
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
        }}
      >
        {message.content}
      </div>

      {/* Quick reply buttons */}
      {message.buttons && message.buttons.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 8,
            maxWidth: "80%",
          }}
        >
          {message.buttons.map((button, index) => (
            <button
              key={index}
              onClick={() => onButtonClick?.(button.value)}
              style={{
                padding: "8px 16px",
                borderRadius: config.borderRadius,
                border: `1px solid ${config.primaryColor}`,
                backgroundColor: "white",
                color: config.primaryColor,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = config.primaryColor;
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.color = config.primaryColor;
              }}
            >
              {button.label}
            </button>
          ))}
        </div>
      )}

      {/* Timestamp */}
      {message.timestamp && (
        <span
          style={{
            fontSize: 11,
            color: "#9ca3af",
            marginTop: 4,
          }}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      )}
    </div>
  );
}
