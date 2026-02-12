import { z } from "zod";

export const createKnowledgeBaseSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  embeddingModel: z
    .enum(["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"])
    .default("text-embedding-3-small"),
  chunkSize: z.number().min(100).max(8000).default(1000),
  chunkOverlap: z.number().min(0).max(1000).default(200),
});

export const updateKnowledgeBaseSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .optional(),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .nullable()
    .optional(),
  chunkSize: z.number().min(100).max(8000).optional(),
  chunkOverlap: z.number().min(0).max(1000).optional(),
});

export const createDocumentSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be less than 255 characters"),
  type: z.enum(["pdf", "docx", "txt", "md", "csv", "url"]),
  sourceUrl: z.string().url("Must be a valid URL").optional(),
});

export const searchKnowledgeBaseSchema = z.object({
  query: z.string().min(1, "Query is required").max(1000, "Query too long"),
  limit: z.number().min(1).max(20).default(5),
  threshold: z.number().min(0).max(1).default(0.7),
  mode: z.enum(["vector", "hybrid"]).default("vector"),
});

export type CreateKnowledgeBaseInput = z.infer<typeof createKnowledgeBaseSchema>;
export type UpdateKnowledgeBaseInput = z.infer<typeof updateKnowledgeBaseSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type SearchKnowledgeBaseInput = z.infer<typeof searchKnowledgeBaseSchema>;
