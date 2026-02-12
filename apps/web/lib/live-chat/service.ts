import type { AgentAvailability, User } from "@prisma/client";
import { prisma } from "@repo/database";
import { emitLiveChatEvent } from "./events";
import type { AssignmentStrategy, HumanHandoffPayload } from "./types";

export interface AgentCandidate {
  availability: AgentAvailability;
  currentLoad: number;
  user: Pick<User, "id" | "email" | "firstName" | "lastName">;
}

const roundRobinCursor = new Map<string, number>();

function getNextRoundRobinIndex(orgId: string, candidates: AgentCandidate[]) {
  const cursor = roundRobinCursor.get(orgId) ?? 0;
  const next = cursor % candidates.length;
  roundRobinCursor.set(orgId, next + 1);
  return next;
}

export async function queueHumanHandoff(options: HumanHandoffPayload) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: options.conversationId },
    include: {
      chatbot: {
        include: {
          workspace: {
            select: {
              organizationId: true,
            },
          },
        },
      },
    },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const organizationId = conversation.chatbot.workspace.organizationId;
  const previousAssignedAgentId = conversation.assignedToId;

  await prisma.$transaction(async (tx) => {
    await tx.conversation.update({
      where: { id: conversation.id },
      data: {
        status: "waiting_for_human",
        assignedToId: null,
        priority: options.priority ?? 0,
        tags: options.tags ?? [],
      },
    });

    if (previousAssignedAgentId) {
      const availability = await tx.agentAvailability.findUnique({
        where: { userId: previousAssignedAgentId },
      });

      if (availability) {
        await tx.agentAvailability.update({
          where: { id: availability.id },
          data: {
            currentConversations: Math.max(0, availability.currentConversations - 1),
          },
        });
      }
    }
  });

  emitLiveChatEvent({
    type: "conversation.status",
    payload: {
      organizationId,
      conversationId: conversation.id,
      status: "waiting_for_human",
      priority: options.priority ?? 0,
    },
  });

  if (options.message) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "system",
        content: options.message,
        metadata: { handoff: true },
      },
    });
  }

  const assignedAgent = await autoAssignAgent(
    conversation.id,
    options.strategy,
    options.tags ?? []
  );

  emitLiveChatEvent({
    type: "conversation.waiting",
    payload: {
      organizationId,
      conversationId: conversation.id,
      assignedAgentId: assignedAgent?.user.id ?? null,
    },
  });

  return { assignedAgent, conversationId: conversation.id };
}

async function autoAssignAgent(
  conversationId: string,
  strategy: AssignmentStrategy = "round_robin",
  tags: string[] = []
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      assignedTo: {
        select: { id: true },
      },
      chatbot: {
        include: {
          workspace: {
            select: { organizationId: true },
          },
        },
      },
    },
  });

  if (!conversation) return null;

  if (conversation.assignedTo?.id) {
    return null;
  }

  const orgId = conversation.chatbot.workspace.organizationId;
  const candidates = await prisma.agentAvailability.findMany({
    where: {
      status: "available",
      user: {
        organizationMembers: {
          some: { organizationId: orgId },
        },
      },
    },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
  });

  if (candidates.length === 0) {
    return null;
  }

  const agentCandidates: AgentCandidate[] = candidates
    .filter((availability) => availability.currentConversations < availability.maxConversations)
    .map((availability) => ({
      availability,
      user: availability.user,
      currentLoad: availability.currentConversations,
    }));

  if (agentCandidates.length === 0) {
    return null;
  }

  let selected: AgentCandidate | null = null;

  if (strategy === "load_based") {
    selected = agentCandidates.reduce<AgentCandidate | null>((best, candidate) => {
      if (!best) return candidate;
      return candidate.currentLoad < best.currentLoad ? candidate : best;
    }, null);
  } else if (strategy === "skill_based" && tags.length > 0) {
    const normalizedTags = new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean));
    const matching = agentCandidates.filter((candidate) => {
      const skills = candidate.availability.skills.map((skill) => skill.trim().toLowerCase());
      return skills.some((skill) => normalizedTags.has(skill));
    });
    selected = matching.reduce<AgentCandidate | null>((best, candidate) => {
      if (!best) return candidate;
      return candidate.currentLoad < best.currentLoad ? candidate : best;
    }, null);
  }

  if (!selected) {
    const index = getNextRoundRobinIndex(orgId, agentCandidates);
    selected = agentCandidates[index];
  }

  if (!selected) {
    return null;
  }

  const [, updatedAvailability] = await prisma.$transaction([
    prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        assignedToId: selected.user.id,
        status: "handed_off",
      },
    }),
    prisma.agentAvailability.update({
      where: { id: selected.availability.id },
      data: {
        currentConversations: { increment: 1 },
      },
    }),
  ]);

  emitLiveChatEvent({
    type: "agent.assigned",
    payload: {
      organizationId: orgId,
      conversationId,
      agentId: selected.user.id,
    },
  });

  emitLiveChatEvent({
    type: "conversation.status",
    payload: {
      organizationId: orgId,
      conversationId,
      status: "handed_off",
      assignedAgentId: selected.user.id,
    },
  });

  emitLiveChatEvent({
    type: "agent.status",
    payload: {
      organizationId: orgId,
      agentId: selected.user.id,
      status: updatedAvailability.status,
      currentConversations: updatedAvailability.currentConversations,
      maxConversations: updatedAvailability.maxConversations,
    },
  });

  return selected;
}

export async function listLiveChatQueue(organizationId: string) {
  const queueWhere = {
    chatbot: {
      workspace: {
        organizationId,
      },
    },
  };

  const resolvedQuery = prisma.conversation.count({
    where: {
      ...queueWhere,
      status: "closed",
    },
  });

  const [queue, activeCount, resolvedCount] = await Promise.all([
    prisma.conversation.findMany({
      where: {
        ...queueWhere,
        status: {
          in: ["waiting_for_human", "handed_off"],
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
        assignedTo: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: {
        priority: "desc",
      },
    }),
    prisma.conversation.count({
      where: {
        ...queueWhere,
        status: "active",
      },
    }),
    resolvedQuery,
  ]);

  const stats = {
    waiting: queue.filter((conversation) => conversation.status === "waiting_for_human").length,
    handedOff: queue.filter((conversation) => conversation.status === "handed_off").length,
    active: activeCount,
    queued: queue.length,
    resolved: resolvedCount,
  };

  return { queue, stats };
}

export async function listAgentsForOrganization(organizationId: string) {
  return prisma.organizationMember.findMany({
    where: { organizationId },
    include: {
      user: {
        include: {
          agentAvailability: true,
        },
      },
    },
  });
}
