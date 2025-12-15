import type { Signal } from "./types";
import type { Signal as RawSignal } from "@/lib/signals/types";

export function mapSignal(s: RawSignal): Signal {
  return {
    id: s.id,
    symbol: s.symbol,
    market: s.market,
    direction: s.direction,

    entry_price: s.entry_price,
    tp1: s.tp1,
    tp2: s.tp2,
    sl: s.sl,

    riskPct: s.riskPct ?? 0.01,
    created_at: s.created_at,
  };
}
