export type EquityPoint = { t: number; equity: number };

export type TradeResult = "WIN" | "LOSS";

export type Metrics = {
  equityCurve: EquityPoint[];
  maxDrawdown: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
};

export function computeMetrics(
  equityCurve: EquityPoint[],
  executions: {
    symbol: string;
    side: "BUY" | "SELL";
    qty: number;
    price: number;
    t: number;
  }[]
): Metrics {
  // ---- Drawdown
  let peak = -Infinity;
  let maxDrawdown = 0;

  for (const p of equityCurve) {
    peak = Math.max(peak, p.equity);
    const dd = peak ? (peak - p.equity) / peak : 0;
    maxDrawdown = Math.max(maxDrawdown, dd);
  }

  // ---- Win / Loss
  let trades = 0;
  let wins = 0;
  let losses = 0;

  const stack: Record<string, { price: number; qty: number }[]> = {};

  for (const e of executions) {
    if (e.side === "BUY") {
      stack[e.symbol] ??= [];
      stack[e.symbol].push({ price: e.price, qty: e.qty });
    } else {
      let remaining = e.qty;
      const opens = stack[e.symbol] ?? [];

      while (remaining > 0 && opens.length) {
        const o = opens.shift()!;
        const closeQty = Math.min(o.qty, remaining);
        const pnl = (e.price - o.price) * closeQty;

        trades += 1;
        pnl > 0 ? wins++ : losses++;

        remaining -= closeQty;
        o.qty -= closeQty;
        if (o.qty > 0) opens.unshift(o);
      }
    }
  }

  return {
    equityCurve,
    maxDrawdown,
    trades,
    wins,
    losses,
    winRate: trades ? wins / trades : 0,
  };
}
