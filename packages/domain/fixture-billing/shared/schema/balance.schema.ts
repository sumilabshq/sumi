import { z } from "zod";

export const ChargeInputSchema = z.object({ amount: z.number().int().positive() });

export type ChargeInput = z.infer<typeof ChargeInputSchema>;

export const BalanceSchema = z.object({ currency: z.string(), total: z.number(), charges: z.number() });

export type Balance = z.infer<typeof BalanceSchema>;
