"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, Typography, Divider } from "@mui/material";

export default function TradeHistoryWidget() {
  const [items, setItems] = useState([]);

  async function load() {
    const res = await fetch("/api/trading/history", { cache: "no-store" });
    const json = await res.json();
    setItems(json.history || []);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
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
          Trade History
        </Typography>

        <Divider sx={{ borderColor: "var(--omega-dark-gold)", my: 2 }} />

        {items.length === 0 && <Typography>No trade activity</Typography>}

        {items.map((h: any) => (
          <div
            key={h.id}
            className="flex justify-between border-b border-omega-dark-gold/40 py-2"
          >
            <div>
              <div className="font-bold">{h.symbol}</div>
              <div className="text-sm opacity-70">
                {h.action.toUpperCase()} • Qty {h.qty}
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm">
                {new Date(h.timestamp).toLocaleString()}
              </div>
              <div className="font-bold">£{Number(h.price).toFixed(2)}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
