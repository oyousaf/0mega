const STARTING_EQUITY = 100000;

export function buildEquityAndDrawdown(
  trades: { closed_at: string; realised_pl: number }[]
) {
  let equity = STARTING_EQUITY;
  let peak = STARTING_EQUITY;

  const series: {
    date: string;
    equity: number;
    drawdown: number;
  }[] = [];

  series.push({
    date: "START",
    equity,
    drawdown: 0,
  });

  for (const t of trades) {
    const pnl = Number(t.realised_pl) || 0;
    equity += pnl;

    if (equity > peak) {
      peak = equity;
    }

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
