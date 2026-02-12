import { prisma } from "@repo/database";

export async function flagQualityIssue(options: {
  messageId: string;
  organizationId: string;
  workspaceId?: string;
  chatbotId?: string;
  reason: string;
  severity?: "low" | "medium" | "high";
}) {
  return prisma.qualityFlag.create({
    data: {
      messageId: options.messageId,
      organizationId: options.organizationId,
      workspaceId: options.workspaceId ?? null,
      chatbotId: options.chatbotId ?? null,
      reason: options.reason,
      severity: options.severity ?? "medium",
    },
  });
}

export async function listPendingFlags(organizationId: string) {
  return prisma.qualityFlag.findMany({
    where: { organizationId, status: "pending" },
    include: {
      message: {
        include: {
          conversation: true,
        },
      },
      reviewer: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function reviewFlag(flagId: string, reviewerId: string, action: "reviewed" | "dismissed") {
  return prisma.qualityFlag.update({
    where: { id: flagId },
    data: {
      status: action,
      reviewerId,
      reviewedAt: new Date(),
    },
  });
}
