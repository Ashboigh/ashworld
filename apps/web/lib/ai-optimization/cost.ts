import { prisma } from "@repo/database";

export async function recordCostUsage(options: {
  organizationId: string;
  chatbotId: string;
  conversationId?: string | null;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
}) {
  return prisma.costUsage.create({
    data: {
      organizationId: options.organizationId,
      chatbotId: options.chatbotId,
      conversationId: options.conversationId ?? null,
      provider: options.provider,
      model: options.model,
      promptTokens: options.promptTokens,
      completionTokens: options.completionTokens,
      totalTokens: options.totalTokens,
      costUsd: options.costUsd,
    },
  });
}

export async function summarizeCost(organizationId: string, since?: Date) {
  const where: { organizationId: string; recordedAt?: { gte: Date } } = {
    organizationId,
  };
  if (since) {
    where.recordedAt = { gte: since };
  }

  const entries = await prisma.costUsage.findMany({
    where,
  });

  return entries.reduce(
    (acc, entry) => {
      acc.totalTokens += entry.totalTokens;
      acc.totalCost += entry.costUsd;
      acc.prompts += entry.promptTokens;
      acc.completions += entry.completionTokens;
      if (!acc.providers[entry.provider]) {
        acc.providers[entry.provider] = 0;
      }
      acc.providers[entry.provider]! += entry.costUsd;
      return acc;
    },
    {
      totalTokens: 0,
      totalCost: 0,
      prompts: 0,
      completions: 0,
      providers: {} as Record<string, number>,
    }
  );
}

const COST_PER_TOKEN: Record<string, number> = {
  openai: 0.00003,
  anthropic: 0.00004,
};

export function estimateTokenCost(provider: string, usage?: { totalTokens?: number }) {
  const totalTokens = usage?.totalTokens ?? 0;
  const rate = COST_PER_TOKEN[provider.toLowerCase()] ?? 0.000035;
  return totalTokens * rate;
}
