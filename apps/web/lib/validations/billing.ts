import { z } from "zod";

export const createCheckoutSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  planSlug: z.string().min(1, "Plan is required"),
  billingInterval: z.enum(["monthly", "yearly"], {
    errorMap: () => ({ message: "Invalid billing interval" }),
  }),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const createPortalSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  returnUrl: z.string().url().optional(),
});

export const cancelSubscriptionSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type CreatePortalInput = z.infer<typeof createPortalSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
