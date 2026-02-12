import { prisma } from '@repo/database';
(async () => {
  const workflow = await prisma.workflow.findFirst({
    where: { name: 'Amalena Support Flow' },
  });
  console.log(JSON.stringify(workflow, null, 2));
  await prisma.$disconnect();
})();
