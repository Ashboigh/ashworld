"use client";

import { MessageCircle, MessageSquare, Headphones } from "lucide-react";
import type { WidgetConfig } from "./types";

interface ChatBubbleProps {
  config: WidgetConfig;
  isOpen: boolean;
  onClick: () => void;
  unreadCount?: number;
}

export function ChatBubble({ config, isOpen, onClick, unreadCount = 0 }: ChatBubbleProps) {
  const Icon = {
    chat: MessageCircle,
    message: MessageSquare,
    support: Headphones,
  }[config.bubbleIcon];

  return (
    <button
      onClick={onClick}
      className="chat-widget-bubble"
      style={{
        width: config.bubbleSize,
        height: config.bubbleSize,
        backgroundColor: config.primaryColor,
        borderRadius: "50%",
        position: "fixed",
        bottom: 20,
        [config.position === "bottom-right" ? "right" : "left"]: 20,
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        transition: "transform 0.2s, box-shadow 0.2s",
        zIndex: 9998,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.05)";
        e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
      }}
      aria-label={isOpen ? "Close chat" : "Open chat"}
    >
      {isOpen ? (
        <svg
          width={config.bubbleSize * 0.4}
          height={config.bubbleSize * 0.4}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        <Icon
          size={config.bubbleSize * 0.4}
          color="white"
          strokeWidth={2}
        />
      )}
      {!isOpen && unreadCount > 0 && (
        <span
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            backgroundColor: "#ef4444",
            color: "white",
            fontSize: 12,
            fontWeight: 600,
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 6px",
          }}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
