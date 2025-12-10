"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, Typography, Divider } from "@mui/material";

export default function OpenTradesWidget() {
  const [data, setData] = useState({ trades: [], balance: 0 });

  async function load() {
    const res = await fetch("/api/trades/open", { cache: "no-store" });
    const json = await res.json();
    setData(json);
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
          Balance: £{data.balance.toFixed(2)}
        </Typography>

        <Divider sx={{ borderColor: "var(--omega-dark-gold)", mb: 2 }} />

        {data.trades.length === 0 && <Typography>No open trades</Typography>}

        {data.trades.map((t: any) => (
          <div
            key={t.id}
            className="flex justify-between border-b border-omega-dark-gold/40 py-2"
          >
            <div>
              <div className="font-bold">{t.symbol}</div>
              <div className="text-sm opacity-70">
                {t.side} • Qty {t.qty}
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm">Entry</div>
              <div className="font-bold">{t.entryPrice}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
