import { Signal } from "@/app/types/signal";

export function buildEquityCurve(signals: Signal[]) {
  let cumulative = 0;

  return signals
    .filter((s) => {
      // Only include trades that are CLOSED or fully hit TP/SL
      return (
        s.status === "CLOSED" ||
        s.status === "TP1 HIT" ||
        s.status === "TP2 HIT" ||
        s.status === "SL HIT"
      );
    })
    .map((s) => {
      let pnl = 0;

      // 1. Use real exit_price when available
      if (s.entry_price !== null && s.exit_price !== null) {
        pnl = ((s.exit_price - s.entry_price) / s.entry_price) * 100;
      } else if (s.entry_price !== null) {
        // 2. Synthetic PnL (fallback)
        if (s.status === "TP2 HIT" && s.tp2 !== null) {
          pnl = ((s.tp2 - s.entry_price) / s.entry_price) * 100;
        } else if (s.status === "TP1 HIT" && s.tp1 !== null) {
          pnl = ((s.tp1 - s.entry_price) / s.entry_price) * 100;
        } else if (s.status === "SL HIT" && s.sl !== null) {
          pnl = ((s.sl - s.entry_price) / s.entry_price) * 100;
        }
      }

      cumulative += pnl;

      return {
        date: new Date(s.created_at),
        pnl,
        cumulative,
      };
    });
}
