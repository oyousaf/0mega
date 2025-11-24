import { z } from "zod";

export const signalSchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  strategy: z
    .string()
    .nullable()
    .transform((v) => v ?? ""),
  entry_price: z.number().positive("Entry price must be greater than 0"),
  tp1: z.number().positive().nullable().optional(),
  tp2: z.number().positive().nullable().optional(),
  sl: z.number().positive().nullable().optional(),
  notes: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" ? v.trim() : "")),
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
