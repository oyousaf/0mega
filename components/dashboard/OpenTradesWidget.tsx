"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, Divider, Typography } from "@mui/material";

type Trade = {
  trade_id: number;
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

type OpenTradesPayload = {
  positions: Trade[];
  balance: number;
};

export default function OpenTradesWidget() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await fetch("/api/trading/open", { cache: "no-store" });
        if (!res.ok) return;

        const json: OpenTradesPayload = await res.json();
        if (!alive) return;

        setTrades(json.positions ?? []);
        setBalance(Number(json.balance) || 0);
      } catch {}
    }

    load();
    const id = setInterval(load, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const fmt = (v: any) =>
    Number.isFinite(Number(v)) ? Number(v).toFixed(2) : "—";

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
          Balance: £{fmt(balance)}
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
                key={`${t.trade_id}-${t.opened_at}`}
                className="rounded-lg border border-omega-dark-gold/40 px-3 py-2 flex flex-col gap-2"
              >
                <div className="flex justify-between items-center">
                  <div className="font-semibold">{t.symbol}</div>
                  <div className="text-xs opacity-70">
                    {t.side} • Qty {fmt(t.qty)}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="opacity-50">Entry</div>
                    <div className="font-semibold">£{fmt(t.entry_price)}</div>
                  </div>

                  <div>
                    <div className="opacity-50">SL</div>
                    <div className="font-semibold">
                      {t.sl != null ? `£${fmt(t.sl)}` : "—"}
                    </div>
                  </div>

                  <div>
                    <div className="opacity-50">TP</div>
                    <div className="font-semibold">
                      {t.tp1 != null ? `£${fmt(t.tp1)}` : "—"}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-end text-xs">
                  <div className="opacity-60">
                    Mark {t.mark_price != null ? `£${fmt(t.mark_price)}` : "—"}
                  </div>

                  <div className={`font-bold ${pnlColor}`}>
                    {pnl != null ? `£${fmt(pnl)}` : "—"}
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
