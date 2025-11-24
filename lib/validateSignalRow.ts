import { z } from "zod";

export const signalRowSchema = z.object({
  id: z.number(),

  symbol: z.string(),
  strategy: z.string().nullable().optional(),

  // DB returns numeric fields as strings → accept both
  entry_price: z.union([z.string(), z.number(), z.null()]),
  tp1: z.union([z.string(), z.number(), z.null()]),
  tp2: z.union([z.string(), z.number(), z.null()]),
  sl: z.union([z.string(), z.number(), z.null()]),

  notes: z.string().nullable().optional(),

  type: z.enum(["stock", "crypto", "forex"]),
  halaal: z.boolean(),

  // DB can return null → allow null
  status: z.string().nullable().optional(),

  current_price: z.union([z.string(), z.number(), z.null()]).optional(),

  created_at: z.any(),
  updated_at: z.any().nullable().optional(),

  // ignore this
  processing: z.boolean().optional(),
});

export function isValidSignalRow(row: any) {
  return signalRowSchema.safeParse(row).success;
}
