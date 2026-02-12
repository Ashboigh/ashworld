import { prisma } from '@repo/database';
(async () => {
  const conv = await prisma.conversation.findFirst({
    where: { sessionId: 'sess_bd5995c6df314ed3a5e452347d3d8a77' },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      chatbot: true,
    },
  });
  console.log(JSON.stringify(conv, null, 2));
  await prisma.$disconnect();
})();
