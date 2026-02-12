import { Worker, Job } from "bullmq";
import { prisma } from "@repo/database";
import { scrapeUrl } from "../knowledge-base/scraper";
import { addDocumentJob, type ScrapeJobData } from "../queue";

const getRedisConfig = () => {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || "6379"),
      password: parsed.password || undefined,
    };
  } catch {
    return {
      host: "localhost",
      port: 6379,
    };
  }
};

async function processScrapeJob(job: Job<ScrapeJobData>) {
  const { knowledgeBaseId, urls, selectors } = job.data;
  const maxUrls = urls.slice(0, 10);
  const results: { url: string; documentId?: string; error?: string }[] = [];

  console.log(`Scraping ${maxUrls.length} URLs for KB ${knowledgeBaseId}`);

  // Process URLs in parallel with concurrency limit
  const concurrency = 5;
  for (let i = 0; i < maxUrls.length; i += concurrency) {
    const batch = maxUrls.slice(i, i + concurrency);

    const batchResults = await Promise.allSettled(
      batch.map(async (url) => {
        try {
          const scraped = await scrapeUrl(url, { selectors });

          const document = await prisma.kBDocument.create({
            data: {
              knowledgeBaseId,
              name: scraped.title || `Scraped: ${new URL(url).hostname}`,
              type: "html",
              sourceUrl: url,
              rawContent: scraped.text,
              status: "pending",
            },
          });

          // Queue for embedding processing
          await addDocumentJob({
            documentId: document.id,
            knowledgeBaseId,
            type: "process",
          });

          return { url, documentId: document.id };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          console.error(`Scrape failed for ${url}:`, errorMessage);
          return { url, error: errorMessage };
        }
      })
    );

    // Collect results
    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      }
    }

    // Update progress
    const progress = Math.round(((i + batch.length) / maxUrls.length) * 100);
    job.updateProgress(progress);
  }

  const successful = results.filter((r) => r.documentId).length;
  console.log(`Scrape job completed: ${successful}/${maxUrls.length} URLs successful`);

  return { results, successful, total: maxUrls.length };
}

// Only start worker if this file is run directly
if (require.main === module) {
  const worker = new Worker<ScrapeJobData>(
    "scrape-processing",
    async (job) => processScrapeJob(job),
    {
      connection: getRedisConfig(),
      concurrency: 3,
    }
  );

  worker.on("completed", (job) => {
    console.log(`Scrape job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Scrape job ${job?.id} failed:`, err.message);
  });

  console.log("Scrape processing worker started");
}

export { processScrapeJob };
