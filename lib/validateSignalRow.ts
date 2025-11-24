import { z } from "zod";

export const signalRowSchema = z.object({
  id: z.number(),

  symbol: z.string(),
  strategy: z.string(),
  entry_price: z.union([z.string(), z.number(), z.null()]),
  tp1: z.union([z.string(), z.number(), z.null()]),
  tp2: z.union([z.string(), z.number(), z.null()]),
  sl: z.union([z.string(), z.number(), z.null()]),
  status: z.union([
    z.enum(["ACTIVE", "TP1 HIT", "TP2 HIT", "SL HIT", "EXPIRED", "INVALID"]),
    z.null(),
  ]),

  halaal: z.boolean(),
  type: z.enum(["stock", "crypto", "forex"]),

  current_price: z.union([z.string(), z.number(), z.null()]),

  // Neon gives Date objects or strings
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date(), z.null()]),

  notes: z.union([z.string(), z.null()]),

  processing: z.boolean(),
});

export function isValidSignalRow(row: any) {
  const validated = signalRowSchema.safeParse(row);

  if (!validated.success) {
    console.error("Invalid row:", row);
    console.error("Error:", validated.error);
  }

  return validated.success;
}
