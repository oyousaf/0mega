"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, Typography, Divider } from "@mui/material";

type OpenTrade = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  entryPrice: number;
  currentPrice?: number;
  pnl?: number;
};

export default function OpenTradesWidget() {
  const [trades, setTrades] = useState<OpenTrade[]>([]);
  const [balance, setBalance] = useState(0);

  async function load() {
    try {
      const res = await fetch("/api/trading/open", { cache: "no-store" });
      if (!res.ok) return;

      const json = await res.json();
      setTrades(json.trades || []);
      setBalance(json.balance || 0);
    } catch {}
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, []);

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
          Balance: £{balance.toFixed(2)}
        </Typography>

        <Divider sx={{ borderColor: "var(--omega-dark-gold)", mb: 2 }} />

        {trades.length === 0 && <Typography>No open trades</Typography>}

        {trades.map((t) => {
          const pnl = t.pnl ?? 0;
          const pnlColor = pnl >= 0 ? "#3cff9a" : "#ff6b6b";

          return (
            <div
              key={t.id}
              className="flex justify-between items-center border-b border-omega-dark-gold/40 py-2"
            >
              <div>
                <div className="font-bold">{t.symbol}</div>
                <div className="text-sm opacity-70">
                  {t.side} • Qty {t.qty}
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm">Entry: {t.entryPrice}</div>

                {t.currentPrice && (
                  <div className="font-bold" style={{ color: pnlColor }}>
                    PnL: {pnl.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
