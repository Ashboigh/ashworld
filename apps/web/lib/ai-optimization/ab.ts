import { prisma } from "@repo/database";

export async function getActiveABTests(chatbotId: string) {
  return prisma.promptTest.findMany({
    where: {
      chatbotId,
      status: "active",
    },
    include: {
      promptVersion: true,
    },
  });
}

export async function recordABExposure(testId: string, variantKey: string, conversationId: string) {
  return prisma.analyticsEvent.create({
    data: {
      organizationId: (await getTestOrganization(testId))!,
      eventType: "workflow.node.executed",
      payload: {
        testId,
        variantKey,
        conversationId,
      },
    },
  });
}

async function getTestOrganization(testId: string) {
  const test = await prisma.promptTest.findUnique({
    where: { id: testId },
    include: {
      promptVersion: {
        include: {
          template: {
            include: {
              workspace: true,
            },
          },
        },
      },
    },
  });
  return test?.promptVersion?.template?.workspace?.organizationId ?? null;
}
