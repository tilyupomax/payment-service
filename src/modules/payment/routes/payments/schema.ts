import { z } from "zod";

export const createPaymentBodySchema = z.object({
  amountMinor: z.number().int().positive(),
  currency: z
    .string()
    .length(3)
    .transform((value) => value.toUpperCase()),
  description: z.string().min(3).max(512).optional(),
  customerEmail: z.string().email().optional()
});

export const webhookBodySchema = z.object({
  paymentId: z.uuid(),
  status: z.enum(["customer_action", "succeeded", "failed"] as const),
  providerReference: z.string().optional(),
  amountMinor: z.number().int().positive().optional(),
  channel: z.enum(["web", "mobile", "widget"] as const).optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional()
});

export const paymentIdParamsSchema = z.object({ paymentId: z.string().uuid() });

export type CreatePaymentBody = z.infer<typeof createPaymentBodySchema>;
export type WebhookBody = z.infer<typeof webhookBodySchema>;
export type PaymentIdParams = z.infer<typeof paymentIdParamsSchema>;
