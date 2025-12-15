type Signal = {
  id: number;
  status: string;
  direction: "BUY" | "SELL";
  entry_price: number;
  tp1?: number;
  tp2?: number;
  sl?: number;
  created_at: string;
};

export type TradeIntent =
  | { type: "OPEN" }
  | { type: "TP1_PARTIAL" }
  | { type: "TP2_CLOSE" }
  | { type: "SL_CLOSE" }
  | { type: "EXPIRED_CLOSE" };

export function evaluateSignal(
  signal: Signal,
  price: number,
  hasOpenTrade: boolean
): TradeIntent | null {
  // already closed
  if (signal.status === "CLOSED") return null;

  // expiration (7 days)
  const ageDays =
    (Date.now() - new Date(signal.created_at).getTime()) / 86400000;
  if (ageDays >= 7 && hasOpenTrade) {
    return { type: "EXPIRED_CLOSE" };
  }

  // not in market yet
  if (!hasOpenTrade) {
    const shouldEnter =
      signal.direction === "BUY"
        ? price >= signal.entry_price
        : price <= signal.entry_price;

    return shouldEnter ? { type: "OPEN" } : null;
  }

  // trade is open
  if (signal.direction === "BUY") {
    if (signal.tp2 && price >= signal.tp2) return { type: "TP2_CLOSE" };
    if (signal.tp1 && price >= signal.tp1) return { type: "TP1_PARTIAL" };
    if (signal.sl && price <= signal.sl) return { type: "SL_CLOSE" };
  }

  if (signal.direction === "SELL") {
    if (signal.tp2 && price <= signal.tp2) return { type: "TP2_CLOSE" };
    if (signal.tp1 && price <= signal.tp1) return { type: "TP1_PARTIAL" };
    if (signal.sl && price >= signal.sl) return { type: "SL_CLOSE" };
  }

  return null;
}
