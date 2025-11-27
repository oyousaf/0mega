import { prettyStatus, AllowedStatus } from "./status";
import { Signal } from "@/app/types/signal";

/**
 * Safely convert any DB row into a fully normalised Signal object.
 * Lightweight, no Zod, no external validation.
 */
export function normalizeSignalRow(row: any): Signal {
  return {
    id: Number(row.id),

    symbol: row.symbol ?? "",
    strategy: row.strategy ?? "",
    type: row.type ?? "crypto",

    halaal: Boolean(row.halaal),

    entry_price: row.entry_price !== null ? Number(row.entry_price) : null,
    tp1: row.tp1 !== null ? Number(row.tp1) : null,
    tp2: row.tp2 !== null ? Number(row.tp2) : null,
    sl: row.sl !== null ? Number(row.sl) : null,
    current_price:
      row.current_price !== null ? Number(row.current_price) : null,

    notes: row.notes ?? "",

    // Always convert DB -> pretty UI status
    status: prettyStatus(row.status) as AllowedStatus,

    // Normalise timestamps to ISO for client hydration safety
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at ?? ""),

    updated_at:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : row.updated_at
        ? String(row.updated_at)
        : null,
  };
}
