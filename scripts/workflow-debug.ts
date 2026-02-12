import { prisma } from "@repo/database";

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: "testuser123@example.com" },
  });
  console.log("user", user?.id, user?.email);

  if (!user) {
    console.log("No user found");
    return;
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
  });
  console.log("org member", membership?.organizationId, membership?.role);

  const workspaceId = "cmkwth9sx0005kynpccaowoqq";
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });
  console.log("workspace", workspace?.id, workspace?.name);

  const workflowCount = await prisma.workflow.count({
    where: { workspaceId },
  });
  console.log("workflow count", workflowCount);
}

main()
  .catch((error) => {
    console.error("debug error", error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
