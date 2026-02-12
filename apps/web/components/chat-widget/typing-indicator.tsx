"use client";

import type { WidgetConfig } from "./types";

interface TypingIndicatorProps {
  config: WidgetConfig;
}

export function TypingIndicator({ config }: TypingIndicatorProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderRadius: config.borderRadius,
          backgroundColor: config.secondaryColor,
          display: "flex",
          gap: 4,
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#9ca3af",
              animation: `typing-dot 1.4s infinite ease-in-out`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes typing-dot {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-4px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
