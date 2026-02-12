import { prisma } from "@repo/database";
import { generateEmbedding } from "./embeddings";

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  metadata: Record<string, unknown>;
}

export interface SearchOptions {
  limit?: number;
  threshold?: number;
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

export async function vectorSearch(
  knowledgeBaseId: string,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { limit = 5, threshold = 0.7 } = options;

  // Get the knowledge base to determine embedding model
  const kb = await prisma.knowledgeBase.findUnique({
    where: { id: knowledgeBaseId },
  });

  if (!kb) {
    throw new Error("Knowledge base not found");
  }

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query, kb.embeddingModel);

  // Get all chunks with embeddings for this knowledge base
  const chunks = await prisma.kBChunk.findMany({
    where: {
      document: {
        knowledgeBaseId,
        status: "completed",
      },
      embedding: { not: null },
    },
    include: {
      document: {
        select: { name: true },
      },
    },
  });

  // Calculate similarity scores
  const scoredResults = chunks
    .map((chunk) => {
      const embedding = chunk.embedding as number[] | null;
      if (!embedding || !Array.isArray(embedding)) {
        return null;
      }
      const score = cosineSimilarity(queryEmbedding, embedding);
      return {
        id: chunk.id,
        content: chunk.content,
        score,
        documentId: chunk.documentId,
        documentName: chunk.document.name,
        chunkIndex: chunk.chunkIndex,
        metadata: (chunk.metadata as Record<string, unknown>) || {},
      };
    })
    .filter((r): r is SearchResult => r !== null && r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scoredResults;
}

export async function hybridSearch(
  knowledgeBaseId: string,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { limit = 5, threshold = 0.5 } = options;

  // Get the knowledge base
  const kb = await prisma.knowledgeBase.findUnique({
    where: { id: knowledgeBaseId },
  });

  if (!kb) {
    throw new Error("Knowledge base not found");
  }

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query, kb.embeddingModel);

  // Get all chunks with embeddings for this knowledge base
  const chunks = await prisma.kBChunk.findMany({
    where: {
      document: {
        knowledgeBaseId,
        status: "completed",
      },
    },
    include: {
      document: {
        select: { name: true },
      },
    },
  });

  // Calculate scores combining vector similarity and keyword matching
  const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);

  const scoredResults = chunks
    .map((chunk) => {
      // Vector similarity score
      const embedding = chunk.embedding as number[] | null;
      let vectorScore = 0;
      if (embedding && Array.isArray(embedding)) {
        vectorScore = cosineSimilarity(queryEmbedding, embedding);
      }

      // Simple keyword matching score
      const contentLower = chunk.content.toLowerCase();
      const matchedTerms = queryTerms.filter((term) =>
        contentLower.includes(term)
      );
      const keywordScore =
        queryTerms.length > 0 ? matchedTerms.length / queryTerms.length : 0;

      // Combined score (70% vector, 30% keyword)
      const combinedScore = vectorScore * 0.7 + keywordScore * 0.3;

      return {
        id: chunk.id,
        content: chunk.content,
        score: combinedScore,
        documentId: chunk.documentId,
        documentName: chunk.document.name,
        chunkIndex: chunk.chunkIndex,
        metadata: (chunk.metadata as Record<string, unknown>) || {},
      };
    })
    .filter((r) => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scoredResults;
}

export function formatSearchResultsAsCitations(
  results: SearchResult[]
): string {
  if (results.length === 0) {
    return "No relevant information found.";
  }

  return results
    .map((r, i) => {
      return `[${i + 1}] From "${r.documentName}":\n${r.content}`;
    })
    .join("\n\n---\n\n");
}
