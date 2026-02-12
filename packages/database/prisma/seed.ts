import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create default plans
  const plans = [
    {
      name: "Free",
      slug: "free",
      description: "For individuals getting started",
      priceMonthly: 0,
      priceYearly: 0,
      limits: { messages: 100, workspaces: 1, chatbots: 1 },
      features: { analytics: false, customBranding: false },
      sortOrder: 0,
    },
    {
      name: "Pro",
      slug: "pro",
      description: "For growing teams",
      priceMonthly: 49,
      priceYearly: 490,
      limits: { messages: 10000, workspaces: 5, chatbots: 10 },
      features: { analytics: true, customBranding: true },
      sortOrder: 1,
    },
    {
      name: "Enterprise",
      slug: "enterprise",
      description: "For large organizations",
      priceMonthly: 199,
      priceYearly: 1990,
      limits: { messages: -1, workspaces: -1, chatbots: -1 },
      features: { analytics: true, customBranding: true, sso: true },
      sortOrder: 2,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
  }

  console.log("Seed completed successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
