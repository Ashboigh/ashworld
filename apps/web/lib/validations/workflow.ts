import { z } from "zod";

export const createWorkflowSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  triggerType: z
    .enum(["conversation_start", "keyword", "intent", "api"])
    .default("conversation_start"),
  isDefault: z.boolean().default(false),
});

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  triggerType: z
    .enum(["conversation_start", "keyword", "intent", "api"])
    .optional(),
  isDefault: z.boolean().optional(),
  nodes: z
    .array(
      z.object({
        nodeId: z.string(),
        type: z.string(),
        positionX: z.number(),
        positionY: z.number(),
        config: z.record(z.unknown()).default({}),
      })
    )
    .optional(),
  edges: z
    .array(
      z.object({
        edgeId: z.string(),
        source: z.string(),
        target: z.string(),
        sourceHandle: z.string().optional().nullable(),
        label: z.string().optional().nullable(),
      })
    )
    .optional(),
  variables: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string(),
        type: z.enum(["string", "number", "boolean", "array", "object"]),
        defaultValue: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
      })
    )
    .optional(),
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
