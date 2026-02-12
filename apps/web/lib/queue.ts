import { Queue } from "bullmq";

const getRedisConfig = () => {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  try {
    const parsed = new URL(url);
    const config: Record<string, unknown> = {
      host: parsed.hostname,
      port: parseInt(parsed.port || "6379"),
      password: parsed.password || undefined,
    };

    // Upstash and other TLS Redis providers use rediss:// protocol
    if (url.startsWith("rediss://")) {
      config.tls = { rejectUnauthorized: false };
    }

    return config;
  } catch {
    return {
      host: "localhost",
      port: 6379,
    };
  }
};

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 1000,
  },
  removeOnComplete: {
    count: 100,
  },
  removeOnFail: {
    count: 100,
  },
};

let _documentQueue: Queue | null = null;
let _scrapeQueue: Queue | null = null;

function getDocumentQueue(): Queue {
  if (!_documentQueue) {
    _documentQueue = new Queue("document-processing", {
      connection: getRedisConfig(),
      defaultJobOptions,
    });
  }
  return _documentQueue;
}

function getScrapeQueue(): Queue {
  if (!_scrapeQueue) {
    _scrapeQueue = new Queue("scrape-processing", {
      connection: getRedisConfig(),
      defaultJobOptions,
    });
  }
  return _scrapeQueue;
}

export const documentQueue = new Proxy({} as Queue, {
  get(_target, prop) {
    return getDocumentQueue()[prop as keyof Queue];
  },
});

export const scrapeQueue = new Proxy({} as Queue, {
  get(_target, prop) {
    return getScrapeQueue()[prop as keyof Queue];
  },
});

export interface DocumentJobData {
  documentId: string;
  knowledgeBaseId: string;
  type: "process" | "delete";
}

export interface ScrapeJobData {
  knowledgeBaseId: string;
  urls: string[];
  selectors?: string[];
}

export async function addDocumentJob(data: DocumentJobData) {
  return getDocumentQueue().add(`document-${data.documentId}`, data, {
    jobId: `doc-${data.documentId}-${data.type}`,
  });
}

export async function addScrapeJob(data: ScrapeJobData) {
  const jobId = `scrape-${data.knowledgeBaseId}-${Date.now()}`;
  return getScrapeQueue().add(jobId, data, { jobId });
}
