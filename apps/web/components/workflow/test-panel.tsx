"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Trash2, X, Eye, EyeOff } from "lucide-react";
import { Button, Input } from "@repo/ui";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ExecutionContext } from "@/lib/workflow";

interface TestPanelProps {
  isOpen: boolean;
  onClose: () => void;
  context: ExecutionContext;
  onSendMessage: (message: string) => void;
  onReset: () => void;
  currentNodeId: string | null;
  onHighlightNode: (nodeId: string | null) => void;
}

export function TestPanel({
  isOpen,
  onClose,
  context,
  onSendMessage,
  onReset,
  currentNodeId,
  onHighlightNode,
}: TestPanelProps) {
  const [input, setInput] = useState("");
  const [showVariables, setShowVariables] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [context.messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-background border rounded-lg shadow-lg flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold">Test Workflow</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowVariables(!showVariables)}
            title={showVariables ? "Hide variables" : "Show variables"}
          >
            {showVariables ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onReset}
            title="Reset conversation"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Variables Inspector */}
      {showVariables && Object.keys(context.variables).length > 0 && (
        <div className="p-2 border-b bg-muted/30 max-h-32 overflow-y-auto">
          <p className="text-xs font-medium text-muted-foreground mb-1">Variables</p>
          <div className="space-y-1">
            {Object.entries(context.variables).map(([key, value]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="font-mono text-muted-foreground">{key}:</span>
                <span className="font-mono truncate max-w-[200px]">
                  {typeof value === "object" ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Node Indicator */}
      {currentNodeId && (
        <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950 border-b">
          <button
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            onClick={() => onHighlightNode(currentNodeId)}
          >
            Current: {currentNodeId}
          </button>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {context.messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : message.role === "system"
                    ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                    : "bg-muted"
                )}
              >
                {message.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
