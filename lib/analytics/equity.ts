const STARTING_EQUITY = 100000; 

export function buildEquityAndDrawdown(
  trades: { closed_at: string; realised_pl: number }[]
) {
  let equity = STARTING_EQUITY;
  let peak = STARTING_EQUITY;

  return trades.map((t) => {
    const pnl = Number(t.realised_pl) || 0;

    equity += pnl;
    peak = Math.max(peak, equity);

    const drawdown = peak > 0 ? ((equity - peak) / peak) * 100 : 0;

    return {
      date: t.closed_at,
      equity,
      drawdown: Math.min(0, drawdown),
    };
  });
}
