"use client";

import { Card, CardContent, Divider, Typography } from "@mui/material";
import { fmtPrice, fmtQty, fmtPnL } from "@/lib/format";
import { useDashboard, DashboardPayload } from "@/hooks/useDashboard";

type Trade = {
  id: number;
  symbol: string;
  side: "BUY" | "SELL";
  entry_price: number;
  qty: number;
  opened_at: string;
  sl: number | null;
  tp1: number | null;
  rr: number | null;
  mark_price: number | null;
  unrealised_pl: number | null;
};

export default function OpenTradesWidget() {
  const data = useDashboard(15000) as DashboardPayload | null;

  const trades = (data?.openTrades ?? []) as Trade[];
  const balance = Number(data?.account?.balance ?? 0);

  return (
    <Card
      sx={{
        background: "var(--omega-green)",
        border: "1px solid var(--omega-dark-gold)",
        borderRadius: "1rem",
      }}
    >
      <CardContent className="p-3 sm:p-4 text-omega-gold">
        <h2 className="text-lg font-semibold text-center mb-1">
          ⏳ Open Trades
        </h2>

        <p className="text-xs text-center opacity-70 mb-2">
          Balance: {fmtPnL(balance)}
        </p>

        <Divider sx={{ borderColor: "var(--omega-dark-gold)", mb: 2 }} />

        {trades.length === 0 && (
          <Typography sx={{ textAlign: "center", opacity: 0.7 }}>
            No open trades
          </Typography>
        )}

        <div className="space-y-2">
          {trades.map((t) => {
            const pnl = t.unrealised_pl;

            const pnlColor =
              pnl == null
                ? "opacity-60"
                : pnl > 0
                  ? "text-green-400"
                  : pnl < 0
                    ? "text-red-400"
                    : "opacity-60";

            return (
              <div
                key={`${t.id}-${t.opened_at}`}
                className="rounded-lg border border-omega-dark-gold/40 px-3 py-2 flex flex-col gap-2"
              >
                <div className="flex justify-between items-center">
                  <div className="font-semibold">{t.symbol}</div>

                  <div className="text-xs opacity-70">
                    {t.side} • Qty {fmtQty(t.qty)}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="opacity-50">Entry</div>
                    <div className="font-semibold">
                      {fmtPrice(t.entry_price, t.symbol)}
                    </div>
                  </div>

                  <div>
                    <div className="opacity-50">SL</div>
                    <div className="font-semibold">
                      {t.sl != null ? fmtPrice(t.sl, t.symbol) : "—"}
                    </div>
                  </div>

                  <div>
                    <div className="opacity-50">TP</div>
                    <div className="font-semibold">
                      {t.tp1 != null ? fmtPrice(t.tp1, t.symbol) : "—"}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-end text-xs">
                  <div className="opacity-60">
                    Mark{" "}
                    {t.mark_price != null
                      ? fmtPrice(t.mark_price, t.symbol)
                      : "—"}
                  </div>

                  <div className={`font-bold ${pnlColor}`}>
                    {pnl != null ? fmtPnL(pnl) : "—"}
                    <div className="text-[0.65rem] opacity-60">unrealised</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
