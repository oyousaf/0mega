import { prettyStatus, AllowedStatus } from "./status";
import { Signal } from "@/app/types/signal";

/**
 * Safely convert any DB row into a fully normalised Signal object.
 * Lightweight, no Zod, no external validation.
 */
export function normalizeSignalRow(row: any) {
  return {
    id: row.id,

    symbol: row.symbol,
    strategy: row.strategy,
    type: row.type,
    halaal: row.halaal,

    entry_price: row.entry_price,
    exit_price: row.exit_price ?? null,
    current_price: row.current_price,

    tp1: row.tp1,
    tp2: row.tp2,
    sl: row.sl,

    tp1_hit: row.tp1_hit ?? false,
    tp2_hit: row.tp2_hit ?? false,
    sl_hit: row.sl_hit ?? false,

    notes: row.notes,
    status: row.status,

    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at,

    updated_at:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : row.updated_at,
  };
}

