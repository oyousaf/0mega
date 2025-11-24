import { z } from "zod";

export const signalRowSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  strategy: z.string(),
  type: z.enum(["stock", "crypto", "forex"]),
  halaal: z.boolean(),

  entry_price: z.number().nullable(),
  tp1: z.number().nullable(),
  tp2: z.number().nullable(),
  sl: z.number().nullable(),
  current_price: z.number().nullable(),

  notes: z.string(),

  status: z.enum([
    "ACTIVE",
    "TP1 HIT",
    "TP2 HIT",
    "SL HIT",
    "EXPIRED",
    "INVALID",
  ]),

  created_at: z.string(),
  updated_at: z.string().nullable(),
});

export function isValidSignalRow(row: any) {
  return signalRowSchema.safeParse(row).success;
}
