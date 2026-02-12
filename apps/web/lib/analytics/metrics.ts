import { prisma } from "@repo/database";
import type {
  AnalyticsFilters,
  AnalyticsMetrics,
  AnalyticsProviderMeta,
  AnalyticsTrends,
} from "./types";

const DEFAULT_LOOKBACK_DAYS = 30;
const MAX_EVENTS = 6000;

function normalizeRange(filters: AnalyticsFilters) {
  const now = new Date();
  const from = filters.from ? new Date(filters.from) : new Date(now.getTime() - DEFAULT_LOOKBACK_DAYS * 86400000);
  const to = filters.to ? new Date(filters.to) : now;
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export async function collectAnalyticsEvents(filters: AnalyticsFilters) {
  const { from, to } = normalizeRange(filters);
  const where: {
    organizationId: string;
    createdAt: { gte: Date; lt: Date };
    workspaceId?: string;
    chatbotId?: string;
    channelId?: string;
  } = {
    organizationId: filters.organizationId,
    createdAt: {
      gte: from,
      lt: to,
    },
  };

  if (filters.workspaceId) {
    where.workspaceId = filters.workspaceId;
  }

  if (filters.chatbotId) {
    where.chatbotId = filters.chatbotId;
  }

  if (filters.channelId) {
    where.channelId = filters.channelId;
  }

  return prisma.analyticsEvent.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: MAX_EVENTS,
    select: {
      eventType: true,
      channelId: true,
      conversationId: true,
      payload: true,
      createdAt: true,
    },
  });
}

function summarizeTrends(events: Array<{ eventType: string; createdAt: Date }>): AnalyticsTrends[] {
  const trendMap = new Map<string, { conversations: number; messages: number }>();

  for (const event of events) {
    const dateKey = event.createdAt.toISOString().split("T")[0]!;
    if (!trendMap.has(dateKey)) {
      trendMap.set(dateKey, { conversations: 0, messages: 0 });
    }
    const group = trendMap.get(dateKey)!;
    if (event.eventType === "conversation.started") {
      group.conversations += 1;
    }
    if (event.eventType === "message.sent") {
      group.messages += 1;
    }
  }

  return Array.from(trendMap.entries()).map(([date, entry]) => ({
    label: date,
    conversations: entry.conversations,
    messages: entry.messages,
  }));
}

export async function collectAnalyticsMetrics(filters: AnalyticsFilters) {
  const { from, to } = normalizeRange(filters);
  const where: {
    organizationId: string;
    createdAt: { gte: Date; lt: Date };
    workspaceId?: string;
    chatbotId?: string;
    channelId?: string;
  } = {
    organizationId: filters.organizationId,
    createdAt: {
      gte: from,
      lt: to,
    },
  };

  if (filters.workspaceId) {
    where.workspaceId = filters.workspaceId;
  }

  if (filters.chatbotId) {
    where.chatbotId = filters.chatbotId;
  }

  if (filters.channelId) {
    where.channelId = filters.channelId;
  }

  const events = await prisma.analyticsEvent.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: MAX_EVENTS,
    select: {
      eventType: true,
      channelId: true,
      payload: true,
      createdAt: true,
    },
  });

  const chatbots = await prisma.chatbot.findMany({
    where: {
      workspace: {
        organizationId: filters.organizationId,
        ...(filters.workspaceId ? { id: filters.workspaceId } : {}),
      },
      ...(filters.chatbotId ? { id: filters.chatbotId } : {}),
    },
    select: {
      id: true,
      name: true,
      workspaceId: true,
    },
  });

  const channels = await prisma.channel.findMany({
    where: {
      chatbot: {
        workspace: {
          organizationId: filters.organizationId,
        },
      },
      ...(filters.chatbotId ? { chatbotId: filters.chatbotId } : {}),
      ...(filters.channelId ? { id: filters.channelId } : {}),
    },
    select: {
      id: true,
      name: true,
      type: true,
    },
  });

  const totalConversations = events.filter((event) => event.eventType === "conversation.started").length;
  const totalMessages = events.filter((event) => event.eventType === "message.sent").length;
  const handoffCount = events.filter((event) => event.eventType === "conversation.handoff").length;
  const resolvedCount = events.filter((event) => event.eventType === "conversation.resolved").length;
  const endedDurations = events
    .filter((event) => event.eventType === "conversation.ended")
    .map((event) => {
      const payload = event.payload as Record<string, unknown> | null;
      return typeof payload?.durationMs === "number" ? payload.durationMs : undefined;
    })
    .filter((value): value is number => typeof value === "number");
  const kbSearchEvents = events.filter((event) => event.eventType === "kb.search");
  const failedSearches = events.filter((event) => event.eventType === "kb.search.failed").length;
  const feedbackEvents = events.filter((event) => event.eventType === "message.feedback");
  const workflowExecutions = events.filter((event) => event.eventType === "workflow.node.executed").length;

  const channelBreakdownMap = new Map<string, number>();
  events
    .filter((event) => event.eventType === "conversation.started")
    .forEach((event) => {
      const channelKey = event.channelId ?? "widget";
      channelBreakdownMap.set(channelKey, (channelBreakdownMap.get(channelKey) ?? 0) + 1);
    });

  const topQueriesMap = new Map<string, number>();
  const topDocumentsMap = new Map<string, number>();

  for (const event of kbSearchEvents) {
    const query = typeof event.payload?.query === "string" ? event.payload.query : "unknown";
    topQueriesMap.set(query, (topQueriesMap.get(query) ?? 0) + 1);

    const docs = Array.isArray(event.payload?.topDocuments)
      ? event.payload.topDocuments
      : [];
    for (const doc of docs.slice(0, 5)) {
      const name = typeof doc === "string" ? doc : String(doc);
      topDocumentsMap.set(name, (topDocumentsMap.get(name) ?? 0) + 1);
    }
  }

  const trending = summarizeTrends(events);
  const averageDuration =
    endedDurations.length > 0
      ? endedDurations.reduce((sum, value) => sum + value, 0) / endedDurations.length
      : null;

  const averageRating =
    feedbackEvents.length > 0
      ? feedbackEvents.reduce((sum, event) => sum + (Number(event.payload?.rating) || 0), 0) /
        feedbackEvents.length
      : 0;

  const channelBreakdown = Array.from(channelBreakdownMap.entries()).map(
    ([channelId, count]) => ({
      channelId,
      count,
    })
  );

  const knowledgeBaseStats = {
    totalSearches: kbSearchEvents.length,
    failedSearches,
    topQueries: Array.from(topQueriesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([query, count]) => ({ query, count })),
    topDocuments: Array.from(topDocumentsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([documentName, count]) => ({ documentName, count })),
  };

  const metrics: AnalyticsMetrics = {
    totalConversations,
    totalMessages,
    selfServiceRate: totalConversations > 0 ? resolvedCount / totalConversations : 0,
    handoffRate: totalConversations > 0 ? handoffCount / totalConversations : 0,
    dropOffRate: totalConversations > 0 ? handoffCount / totalConversations : 0,
    averageConversationDurationMs: averageDuration,
    channelBreakdown,
    trends: trending,
    knowledgeBase: knowledgeBaseStats,
    feedback: {
      totalRatings: feedbackEvents.length,
      averageRating,
    },
    workflowExecutions,
  };

  const meta: AnalyticsProviderMeta = {
    chatbots,
    channels,
  };

  return { metrics, meta, range: { from, to } };
}
