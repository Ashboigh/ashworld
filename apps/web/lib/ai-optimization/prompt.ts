import { prisma } from "@repo/database";

export async function listPromptTemplates(workspaceId: string) {
  return prisma.promptTemplate.findMany({
    where: { workspaceId },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 5,
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createPromptTemplate(
  workspaceId: string,
  name: string,
  createdById: string,
  options: {
    description?: string;
    category?: string;
    variables?: string[];
  }
) {
  return prisma.promptTemplate.create({
    data: {
      workspaceId,
      name,
      description: options.description ?? null,
      category: options.category ?? "system",
      variables: options.variables ?? [],
      createdById,
    },
  });
}

export async function createPromptVersion(
  templateId: string,
  createdById: string,
  content: string,
  metadata: {
    summary?: string;
    modelProvider: string;
    modelName: string;
    temperature: number;
    maxTokens: number;
  }
) {
  const currentMax = await prisma.promptVersion.findFirst({
    where: { templateId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const nextVersion = (currentMax?.version ?? 0) + 1;

  return prisma.promptVersion.create({
    data: {
      templateId,
      content,
      summary: metadata.summary ?? null,
      modelProvider: metadata.modelProvider,
      modelName: metadata.modelName,
      temperature: metadata.temperature,
      maxTokens: metadata.maxTokens,
      version: nextVersion,
      createdById,
    },
  });
}
