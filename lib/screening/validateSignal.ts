import { z } from "zod";

// Helpers
function normalizeSymbol(raw: string) {
  const s = raw.trim().toUpperCase();
  return s.endsWith("USD") ? s : s + "USD";
}

function cleanString(v: any) {
  if (typeof v !== "string") return "";
  return v.replace(/[^\w\s.\-_]/g, "").trim();
}

// Schema
const baseSchema = z.object({
  symbol: z.string().min(1),
  strategy: z.string().nullable().optional(),
  type: z.enum(["stock", "crypto", "forex"]),
  direction: z.enum(["BUY", "SELL"]),
  entry_price: z.number().positive(),
  tp1: z.number().positive().optional(),
  tp2: z.number().positive().optional(),
  sl: z.number().positive().optional(),
  notes: z.string().nullable().optional(),
  halaal: z.boolean().default(true),
});

export function validateSignal(payload: any) {
  const parsed = baseSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      valid: false,
      error: parsed.error.issues[0]?.message ?? "Invalid signal",
      data: null,
    };
  }

  const data = parsed.data;

  // Extract values
  let { entry_price, tp1, tp2, sl } = data;

  // Guard for undefined/null
  if (tp1 == null || tp2 == null || sl == null) {
    return { valid: false, error: "tp1, tp2 and sl are required", data: null };
  }

  // Narrowed types
  tp1 = tp1 as number;
  tp2 = tp2 as number;
  sl = sl as number;

  // BUY/SELL structure rules
  if (data.direction === "BUY") {
    const ok = sl < entry_price && tp1 > entry_price && tp2 > tp1;
    if (!ok) {
      return {
        valid: false,
        error: "Invalid BUY structure (SL < entry < TP1 < TP2)",
        data: null,
      };
    }
  }

  if (data.direction === "SELL") {
    const ok = sl > entry_price && tp1 < entry_price && tp2 < tp1;
    if (!ok) {
      return {
        valid: false,
        error: "Invalid SELL structure (SL > entry > TP1 > TP2)",
        data: null,
      };
    }
  }

  // Return clean output
  return {
    valid: true,
    error: null,
    data: {
      ...data,
      symbol: normalizeSymbol(data.symbol),
      strategy: cleanString(data.strategy),
      notes: cleanString(data.notes),
      halaal: true,
    },
  };
}
