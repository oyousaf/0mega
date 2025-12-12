"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, Typography, Divider } from "@mui/material";
import { Trade } from "@/app/types/trade";

export default function OpenTradesWidget() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [balance, setBalance] = useState(0);

  async function load() {
    try {
      const res = await fetch("/api/trading/open", { cache: "no-store" });
      if (!res.ok) return;

      const json = await res.json();
      setTrades(Array.isArray(json.trades) ? json.trades : []);
      setBalance(Number(json.balance) || 0);
    } catch {}
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, []);

  /* Safe helpers */
  const n = (v: any) => {
    const x = Number(v);
    return isFinite(x) ? x : 0;
  };
  const safeNum = (v: any) => {
    const x = Number(v);
    return isFinite(x) ? x.toFixed(2) : "—";
  };

  return (
    <Card
      sx={{
        background: "var(--omega-green)",
        border: "1px solid var(--omega-dark-gold)",
        borderRadius: "1rem",
        color: "var(--omega-gold)",
      }}
    >
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Open Trades
        </Typography>

        <Typography sx={{ opacity: 0.7, mb: 2 }}>
          Balance: £{safeNum(balance)}
        </Typography>

        <Divider sx={{ borderColor: "var(--omega-dark-gold)", mb: 2 }} />

        {trades.length === 0 && <Typography>No open trades</Typography>}

        {trades.map((t) => {
          const entry = n(t.entry_fill_price ?? t.entry_price);
          const pnl = n(t.realised_pl ?? 0);
          const pnlPct =
            entry > 0 && t.qty > 0
              ? ((pnl / (entry * t.qty)) * 100).toFixed(2)
              : "0.00";

          const pnlColor = pnl >= 0 ? "#3cff9a" : "#ff6b6b";

          return (
            <div
              key={t.trade_id}
              className="flex justify-between items-center border-b border-omega-dark-gold/40 py-2"
            >
              <div>
                <div className="font-bold">{t.symbol}</div>

                <div className="text-sm opacity-70">
                  {t.side} • Qty {t.qty}
                  {t.strategy && (
                    <span className="ml-2 text-xs opacity-60">
                      ({t.strategy})
                    </span>
                  )}
                </div>

                <div className="text-xs opacity-60 mt-1">
                  Entry: £{safeNum(entry)}
                  {t.rr !== null && (
                    <span className="ml-2 text-omega-gold">
                      R:R {safeNum(t.rr)}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="font-bold" style={{ color: pnlColor }}>
                  £{safeNum(pnl)}{" "}
                  <span className="opacity-70 text-xs">({pnlPct}%)</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
