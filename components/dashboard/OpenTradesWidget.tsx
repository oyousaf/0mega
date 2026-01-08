"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, Typography, Divider } from "@mui/material";
import { Trade } from "@/app/types/trade";

type OpenTradesPayload = {
  trades: Trade[];
  balance: number;
};

export default function OpenTradesWidget() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [balance, setBalance] = useState(0);

  async function load() {
    try {
      const res = await fetch("/api/trading/open", { cache: "no-store" });
      if (!res.ok) return;

      const json: OpenTradesPayload = await res.json();
      setTrades(Array.isArray(json.trades) ? json.trades : []);
      setBalance(Number(json.balance) || 0);
    } catch (err) {
      console.error("Open trades load failed", err);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, []);

  const n = (v: any) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };

  const safeNum = (v: any) => {
    const x = Number(v);
    return Number.isFinite(x) ? x.toFixed(2) : "—";
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
        <h2 className="text-xl font-semibold text-omega-gold mb-1 text-center">
          ⏳ Open Trades
        </h2>

        <p className="text-sm text-omega-gold/70 mb-2 text-center">
          Balance: £{safeNum(balance)}
        </p>

        <Divider sx={{ borderColor: "var(--omega-dark-gold)", mb: 2 }} />

        {trades.length === 0 && (
          <Typography sx={{ color: "var(--omega-gold)", textAlign: "center" }}>
            No open trades
          </Typography>
        )}

        {trades.map((t) => {
          const entry = n(t.entry_price);
          const qty = n(t.qty);

          return (
            <div
              key={t.trade_id}
              className="
                flex justify-between items-center
                border-b border-omega-dark-gold/40 py-2
                text-omega-gold last:border-0
              "
            >
              <div>
                <div className="font-bold">{t.symbol}</div>

                <div className="text-sm opacity-70">
                  {t.side} • Qty {qty}
                  {t.strategy && (
                    <span className="ml-2 text-xs opacity-60">
                      ({t.strategy})
                    </span>
                  )}
                </div>

                <div className="text-xs opacity-60 mt-1">
                  Entry: £{safeNum(entry)}
                  {t.rr !== null && (
                    <span className="ml-2">R:R {safeNum(t.rr)}</span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="font-bold opacity-60">—</div>
                <div className="text-xs opacity-50">unrealised</div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
