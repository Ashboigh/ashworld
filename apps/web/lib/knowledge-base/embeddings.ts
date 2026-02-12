import OpenAI from "openai";

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export async function generateEmbedding(
  text: string,
  model: string = "text-embedding-3-small"
): Promise<number[]> {
  const response = await getOpenAIClient().embeddings.create({
    model,
    input: text,
  });

  return response.data[0]!.embedding;
}

export async function generateEmbeddings(
  texts: string[],
  model: string = "text-embedding-3-small"
): Promise<number[][]> {
  // OpenAI has a limit of 2048 inputs per request
  const batchSize = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await getOpenAIClient().embeddings.create({
      model,
      input: batch,
    });

    const embeddings = response.data.map((d) => d.embedding);
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
