export type AnalyticsEventType =
  | "conversation.started"
  | "conversation.ended"
  | "conversation.resolved"
  | "conversation.handoff"
  | "message.sent"
  | "message.feedback"
  | "kb.search"
  | "kb.search.failed"
  | "workflow.node.executed"
  | "widget.opened"
  | "widget.closed";

export interface AnalyticsFilters {
  organizationId: string;
  workspaceId?: string;
  chatbotId?: string;
  channelId?: string;
  from?: Date;
  to?: Date;
}

export interface AnalyticsMetricsEntry {
  label: string;
  value: number;
}

export interface AnalyticsChannelBreakdown {
  channelId: string | null;
  count: number;
}

export interface AnalyticsKnowledgeBaseStats {
  totalSearches: number;
  failedSearches: number;
  topQueries: Array<{ query: string; count: number }>;
  topDocuments: Array<{ documentName: string; count: number }>;
}

export interface AnalyticsFeedbackStats {
  totalRatings: number;
  averageRating: number;
}

export interface AnalyticsTrends {
  label: string;
  conversations: number;
  messages: number;
}

export interface AnalyticsMetrics {
  totalConversations: number;
  totalMessages: number;
  selfServiceRate: number;
  handoffRate: number;
  dropOffRate: number;
  averageConversationDurationMs: number | null;
  channelBreakdown: AnalyticsChannelBreakdown[];
  trends: AnalyticsTrends[];
  knowledgeBase: AnalyticsKnowledgeBaseStats;
  feedback: AnalyticsFeedbackStats;
  workflowExecutions: number;
}

export interface AnalyticsProviderMeta {
  chatbots: Array<{ id: string; name: string; workspaceId: string }>;
  channels: Array<{ id: string; name: string | null; type: string }>;
}
