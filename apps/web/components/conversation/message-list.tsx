"use client";

import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { User, Bot, ThumbsUp, ThumbsDown } from "lucide-react";

interface Message {
  id: string;
  role: string;
  content: string;
  nodeId: string | null;
  aiModel: string | null;
  tokenCount: number | null;
  latencyMs: number | null;
  feedbackRating: number | null;
  feedbackText: string | null;
  createdAt: string;
}

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => {
        const isUser = message.role === "user";
        const isSystem = message.role === "system";

        if (isSystem) {
          return (
            <div
              key={message.id}
              className="flex justify-center"
            >
              <div className="bg-muted px-4 py-2 rounded-full text-sm text-muted-foreground">
                {message.content}
              </div>
            </div>
          );
        }

        return (
          <div
            key={message.id}
            className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                isUser ? "bg-primary/10" : "bg-secondary"
              }`}
            >
              {isUser ? (
                <User className="w-4 h-4 text-primary" />
              ) : (
                <Bot className="w-4 h-4 text-secondary-foreground" />
              )}
            </div>

            <div className={`flex flex-col max-w-[70%] ${isUser ? "items-end" : ""}`}>
              <div
                className={`rounded-lg px-4 py-2 ${
                  isUser
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>

              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>
                  {format(new Date(message.createdAt), "HH:mm")}
                </span>

                {!isUser && message.aiModel && (
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {message.aiModel}
                  </span>
                )}

                {!isUser && message.latencyMs && (
                  <span>{message.latencyMs}ms</span>
                )}

                {!isUser && message.feedbackRating && (
                  <span className="flex items-center gap-1">
                    {message.feedbackRating >= 4 ? (
                      <ThumbsUp className="w-3 h-3 text-green-600" />
                    ) : message.feedbackRating <= 2 ? (
                      <ThumbsDown className="w-3 h-3 text-red-600" />
                    ) : null}
                    {message.feedbackRating}/5
                  </span>
                )}
              </div>

              {message.feedbackText && (
                <div className="mt-1 text-xs text-muted-foreground italic">
                  &quot;{message.feedbackText}&quot;
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
