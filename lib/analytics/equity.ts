export function buildEquityAndDrawdown(
  trades: { closed_at: string; realised_pl: number }[]
) {
  let equity = 0;
  let peak = 0;

  return trades.map((t) => {
    equity += Number(t.realised_pl) || 0;
    peak = Math.max(peak, equity);

    return {
      date: t.closed_at,
      equity,
      drawdown: peak > 0 ? ((equity - peak) / peak) * 100 : 0,
    };
  });
}
