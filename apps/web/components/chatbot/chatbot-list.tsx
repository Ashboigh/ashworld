"use client";

import { ChatbotCard } from "./chatbot-card";
import { Bot } from "lucide-react";

interface ChatbotData {
  id: string;
  name: string;
  description: string | null;
  status: string;
  personaName: string | null;
  aiModel: string;
  conversationCount: number;
  channelCount: number;
  activeConversations: number;
  createdAt: string;
  updatedAt: string;
}

interface ChatbotListProps {
  chatbots: ChatbotData[];
  workspaceId: string;
  orgSlug: string;
}

export function ChatbotList({ chatbots, workspaceId, orgSlug }: ChatbotListProps) {
  if (chatbots.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/50">
        <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No chatbots yet</h3>
        <p className="text-muted-foreground mb-4">
          Create your first chatbot to start engaging with users
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {chatbots.map((chatbot) => (
        <ChatbotCard
          key={chatbot.id}
          chatbot={chatbot}
          orgSlug={orgSlug}
          workspaceId={workspaceId}
        />
      ))}
    </div>
  );
}
