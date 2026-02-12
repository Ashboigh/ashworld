import { Worker, Job } from "bullmq";
import { prisma } from "@repo/database";
import { extractText } from "../knowledge-base/extractors";
import { chunkText, estimateTokenCount } from "../knowledge-base/chunker";
import { generateEmbeddings } from "../knowledge-base/embeddings";
import type { DocumentJobData } from "../queue";
import * as fs from "fs/promises";

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


async function processDocument(job: Job<DocumentJobData>) {
  const { documentId } = job.data;

  console.log(`Processing document ${documentId}`);

  // Get document and knowledge base settings
  const document = await prisma.kBDocument.findUnique({
    where: { id: documentId },
    include: {
      knowledgeBase: true,
    },
  });

  if (!document) {
    throw new Error(`Document ${documentId} not found`);
  }

  // Update status to processing
  await prisma.kBDocument.update({
    where: { id: documentId },
    data: { status: "processing" },
  });

  try {
    // Extract text based on available content
    let content: Buffer | string | undefined;

    if (document.rawContent) {
      content = document.rawContent;
    } else if (document.filePath) {
      content = await fs.readFile(document.filePath);
    } else if (document.type === "url" && document.sourceUrl) {
      content = document.sourceUrl;
    }

    if (!content) {
      throw new Error("No content source available for document");
    }

    const extractedText = await extractText(content, document.type);

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("No text content could be extracted from document");
    }

    // Update raw content
    await prisma.kBDocument.update({
      where: { id: documentId },
      data: { rawContent: extractedText },
    });

    job.updateProgress(30);

    // Chunk the text
    const chunks = await chunkText(extractedText, {
      chunkSize: document.knowledgeBase.chunkSize,
      chunkOverlap: document.knowledgeBase.chunkOverlap,
    });

    console.log(`Created ${chunks.length} chunks for document ${documentId}`);
    job.updateProgress(50);

    // Generate embeddings in batches
    const chunkTexts = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(
      chunkTexts,
      document.knowledgeBase.embeddingModel
    );

    job.updateProgress(80);

    // Delete existing chunks for this document
    await prisma.kBChunk.deleteMany({
      where: { documentId },
    });

    // Store chunks with embeddings using Prisma createMany for better performance
    const BATCH_SIZE = 50;
    for (let batchStart = 0; batchStart < chunks.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, chunks.length);
      const batchChunks = chunks.slice(batchStart, batchEnd);
      const batchEmbeddings = embeddings.slice(batchStart, batchEnd);

      // Prepare batch data
      const chunkData = batchChunks.map((chunk, idx) => {
        const globalIdx = batchStart + idx;
        const embedding = batchEmbeddings[idx]!;
        const tokenCount = estimateTokenCount(chunk.content);

        return {
          id: `chunk_${documentId}_${globalIdx}`,
          documentId,
          content: chunk.content,
          embedding: embedding, // Stored as JSON array
          chunkIndex: chunk.chunkIndex,
          tokenCount,
          metadata: chunk.metadata,
        };
      });

      // Execute batch insert using Prisma
      await prisma.kBChunk.createMany({
        data: chunkData,
        skipDuplicates: true,
      });

      // Update progress during chunk insertion
      const insertProgress = 80 + Math.round((batchEnd / chunks.length) * 20);
      job.updateProgress(insertProgress);
    }

    // Update document status
    await prisma.kBDocument.update({
      where: { id: documentId },
      data: {
        status: "completed",
        processedAt: new Date(),
      },
    });

    job.updateProgress(100);
    console.log(`Successfully processed document ${documentId}`);

    return { success: true, chunks: chunks.length };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error processing document ${documentId}:`, errorMessage);

    await prisma.kBDocument.update({
      where: { id: documentId },
      data: {
        status: "failed",
        errorMessage,
      },
    });

    throw error;
  }
}

async function deleteDocumentChunks(job: Job<DocumentJobData>) {
  const { documentId } = job.data;

  await prisma.kBChunk.deleteMany({
    where: { documentId },
  });

  console.log(`Deleted chunks for document ${documentId}`);
  return { success: true };
}

// Only start worker if this file is run directly
if (require.main === module) {
  const worker = new Worker<DocumentJobData>(
    "document-processing",
    async (job) => {
      if (job.data.type === "process") {
        return processDocument(job);
      } else if (job.data.type === "delete") {
        return deleteDocumentChunks(job);
      }
      throw new Error(`Unknown job type: ${job.data.type}`);
    },
    {
      connection: getRedisConfig(),
      concurrency: 2,
    }
  );

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  console.log("Document processing worker started");
}

export { processDocument, deleteDocumentChunks };
