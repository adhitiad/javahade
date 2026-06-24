import { z } from 'zod';

export const topUpSchema = z.object({
  amount: z.number().int().min(500, {
    message: 'Top-up minimal adalah 500 sen ($5.00).',
  }),
  currency: z.string().default('USD'),
  provider_preference: z.enum(['segpay', 'verotel', 'elotpay', 'netbilling']).default('segpay'),
});

export type TopUpRequest = z.infer<typeof topUpSchema>;
