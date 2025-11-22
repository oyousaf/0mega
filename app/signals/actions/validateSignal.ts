import { z } from "zod";

export const signalSchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  strategy: z.string().optional(),
  entry_price: z.number().positive("Entry price must be greater than 0"),
  tp1: z.number().positive().optional(),
  tp2: z.number().positive().optional(),
  sl: z.number().positive().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
  type: z.enum(["stock", "crypto", "forex"]),
  halaal: z.boolean(),
});


export function validateSignal(payload: any) {
  const parsed = signalSchema.safeParse(payload);

  return {
    valid: parsed.success,
    data: parsed.success ? parsed.data : null,
    error: parsed.success
      ? null
      : parsed.error.issues[0]?.message ?? "Invalid signal",
  };
}
