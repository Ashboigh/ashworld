import { prisma } from "../packages/database/src/index";
import { getAmalenaWorkflowTemplates } from "../apps/web/lib/workflow/templates/amalena";

async function main() {
  const workspaceId = "cmkwth9sx0005kynpccaowoqq";
  const templates = getAmalenaWorkflowTemplates();
  const names = templates.map((template) => template.name);
  const existing = await prisma.workflow.findMany({
    where: { workspaceId, name: { in: names } },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((wf) => wf.name));
  const created: string[] = [];
  let hasDefault =
    (await prisma.workflow.count({
      where: { workspaceId, isDefault: true },
    })) > 0;

  for (const template of templates) {
    if (existingNames.has(template.name)) {
      continue;
    }

    const shouldSetDefault = template.isDefault && !hasDefault;

    await prisma.workflow.create({
      data: {
        workspaceId,
        name: template.name,
        description: template.description,
        status: "published",
        triggerType: template.triggerType,
        isDefault: shouldSetDefault,
        nodes: {
          create: template.nodes.map((node) => ({
            nodeId: node.nodeId,
            type: node.type,
            positionX: node.positionX,
            positionY: node.positionY,
            config: node.config,
          })),
        },
        edges: {
          create: template.edges.map((edge) => ({
            edgeId: edge.edgeId,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            label: edge.label,
          })),
        },
        variables: {
          create: (template.variables ?? []).map((variable) => ({
            name: variable.name,
            type: variable.type,
            defaultValue: variable.defaultValue,
            description: variable.description,
          })),
        },
      },
    });

    created.push(template.name);
    if (shouldSetDefault) hasDefault = true;
  }

  console.log("created", created);
}

main()
  .catch((error) => {
    console.error("import error", error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
