const STARTING_EQUITY = 100000;

type TradePoint = {
  closed_at: string;
  realised_pl: number;
};

export function buildEquityAndDrawdown(trades: TradePoint[]) {
  // 1. Enforce chronological order (oldest → newest)
  const ordered = [...trades].sort(
    (a, b) =>
      new Date(a.closed_at).getTime() -
      new Date(b.closed_at).getTime()
  );

  let equity = STARTING_EQUITY;
  let peak = STARTING_EQUITY;

  const series: {
    date: string;
    equity: number;
    drawdown: number;
  }[] = [];

  // Optional anchor point
  series.push({
    date: ordered[0]?.closed_at ?? "START",
    equity,
    drawdown: 0,
  });

  for (const t of ordered) {
    const pnl = Number(t.realised_pl) || 0;
    equity += pnl;

    if (equity > peak) peak = equity;

    const drawdown =
      peak > 0 ? ((equity - peak) / peak) * 100 : 0;

    series.push({
      date: t.closed_at,
      equity,
      drawdown: Math.min(0, drawdown),
    });
  }

  return series;
}
