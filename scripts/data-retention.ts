import { prisma } from "@repo/database";

async function runRetention() {
  const schedules = await prisma.dataRetentionSchedule.findMany();
  const now = new Date();
  for (const schedule of schedules) {
    if (schedule.nextRunAt <= now) {
      console.log(`Purging ${schedule.resourceType} older than ${schedule.retentionDays} days`);
      // Placeholder for pruning job; actual logic would filter by resource type and delete records.
      await prisma.dataRetentionSchedule.update({
        where: { id: schedule.id },
        data: {
          nextRunAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      });
    }
  }
}

runRetention().catch((error) => {
  console.error("Retention job failed", error);
  process.exit(1);
});
