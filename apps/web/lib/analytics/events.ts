import type { AnalyticsEventType } from "./types";
import { prisma } from "@repo/database";

export interface RecordAnalyticsEventOptions {
  organizationId: string;
  workspaceId?: string | null;
  chatbotId?: string | null;
  channelId?: string | null;
  conversationId?: string | null;
  userId?: string | null;
  eventType: AnalyticsEventType;
  payload?: Record<string, unknown>;
}

export async function recordAnalyticsEvent(options: RecordAnalyticsEventOptions) {
  try {
    await prisma.analyticsEvent.create({
      data: {
        organizationId: options.organizationId,
        workspaceId: options.workspaceId ?? null,
        chatbotId: options.chatbotId ?? null,
        channelId: options.channelId ?? null,
        conversationId: options.conversationId ?? null,
        userId: options.userId ?? null,
        eventType: options.eventType,
        payload: (options.payload ?? {}) as object,
      },
    });
  } catch (error) {
    console.error("Failed to record analytics event:", error);
  }
}
