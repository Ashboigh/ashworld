"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, User, Clock, Filter } from "lucide-react";
import { Input } from "@repo/ui";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Conversation {
  id: string;
  sessionId: string;
  status: string;
  lastMessageAt: string | null;
  createdAt: string;
  _count: {
    messages: number;
  };
  messages: Array<{
    content: string;
    role: string;
    createdAt: string;
  }>;
  chatbot?: {
    id: string;
    name: string;
  };
}

interface ConversationListProps {
  conversations: Conversation[];
  orgSlug: string;
  chatbotId?: string;
  selectedId?: string;
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  waiting_for_human: "bg-yellow-100 text-yellow-800",
  handed_off: "bg-blue-100 text-blue-800",
  closed: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  waiting_for_human: "Waiting",
  handed_off: "Handed Off",
  closed: "Closed",
};

export function ConversationList({
  conversations,
  orgSlug,
  chatbotId,
  selectedId,
}: ConversationListProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = conversations.filter((conv) => {
    // Status filter
    if (statusFilter !== "all" && conv.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const lastMessage = conv.messages[0]?.content.toLowerCase() || "";
      const sessionId = conv.sessionId.toLowerCase();
      const query = searchQuery.toLowerCase();
      return lastMessage.includes(query) || sessionId.includes(query);
    }

    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-4 border-b space-y-3">
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="waiting_for_human">Waiting</SelectItem>
              <SelectItem value="handed_off">Handed Off</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No conversations found</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conversation) => {
              const lastMessage = conversation.messages[0];
              const basePath = chatbotId
                ? `/${orgSlug}/chatbots/${chatbotId}/conversations`
                : conversation.chatbot?.id
                  ? `/${orgSlug}/chatbots/${conversation.chatbot.id}/conversations`
                  : `/${orgSlug}/conversations`;

              return (
                <Link
                  key={conversation.id}
                  href={`${basePath}/${conversation.id}`}
                  className={`block p-4 hover:bg-muted/50 transition-colors ${
                    selectedId === conversation.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <span className="text-sm font-medium">
                          {conversation.sessionId.slice(0, 12)}...
                        </span>
                        {conversation.chatbot && !chatbotId && (
                          <span className="text-xs text-muted-foreground ml-2">
                            via {conversation.chatbot.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge
                      className={statusColors[conversation.status] || statusColors.active}
                    >
                      {statusLabels[conversation.status] || conversation.status}
                    </Badge>
                  </div>

                  {lastMessage && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {lastMessage.role === "user" ? "User: " : "Bot: "}
                      {lastMessage.content}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {conversation._count.messages} messages
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(
                        new Date(conversation.lastMessageAt || conversation.createdAt),
                        { addSuffix: true }
                      )}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
