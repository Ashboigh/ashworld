import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

export interface ChunkOptions {
  chunkSize: number;
  chunkOverlap: number;
}

export interface TextChunk {
  content: string;
  chunkIndex: number;
  metadata: {
    startChar: number;
    endChar: number;
  };
}

export async function chunkText(
  text: string,
  options: ChunkOptions
): Promise<TextChunk[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: options.chunkSize,
    chunkOverlap: options.chunkOverlap,
    separators: ["\n\n", "\n", ". ", " ", ""],
  });

  const docs = await splitter.createDocuments([text]);

  return docs.map((doc, index) => {
    // Calculate approximate positions
    const startChar = index === 0 ? 0 : text.indexOf(doc.pageContent.slice(0, 50));
    const endChar = startChar + doc.pageContent.length;

    return {
      content: doc.pageContent,
      chunkIndex: index,
      metadata: {
        startChar: Math.max(0, startChar),
        endChar: endChar,
      },
    };
  });
}

export function estimateTokenCount(text: string): number {
  // Rough estimate: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}
