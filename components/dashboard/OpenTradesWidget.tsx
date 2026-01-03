"use client";

import { useEffect, useState } from "react";
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
      }}
    >
      <CardContent sx={{ color: "var(--omega-gold)" }}>
        <h2 className="text-xl font-semibold text-omega-gold mb-1">
          ⏳ Open Trades
        </h2>

        <p className="text-sm text-omega-gold/70 mb-2">
          Balance: £{safeNum(balance)}
        </p>

        <Divider sx={{ borderColor: "var(--omega-dark-gold)", mb: 2 }} />

        {trades.length === 0 && (
          <Typography sx={{ color: "var(--omega-gold)" }}>
            No open trades
          </Typography>
        )}

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
              className="
                flex justify-between items-center
                border-b border-omega-dark-gold/40 py-2
                text-omega-gold
              "
            >
              <div>
                <div className="font-bold text-omega-gold">{t.symbol}</div>

                <div className="text-sm opacity-70 text-omega-gold">
                  {t.side} • Qty {t.qty}
                  {t.strategy && (
                    <span className="ml-2 text-xs opacity-60 text-omega-gold">
                      ({t.strategy})
                    </span>
                  )}
                </div>

                <div className="text-xs opacity-60 mt-1 text-omega-gold">
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
