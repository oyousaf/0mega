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
  sl?: number | null;
  tp1?: number | null;
  rr?: number | null;
  realised_pl?: number | null;
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

        setTrades(Array.isArray(json.positions) ? json.positions : []);
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

  const fmt = (v: any) => {
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
      <CardContent className="p-3 sm:p-4 text-omega-gold">
        <h2 className="text-lg font-semibold text-center mb-1">
          ⏳ Open Trades
        </h2>

        <p className="text-xs text-center opacity-70 mb-2">
          Balance (free): £{fmt(balance)}
        </p>

        <Divider sx={{ borderColor: "var(--omega-dark-gold)", mb: 2 }} />

        {trades.length === 0 && (
          <Typography sx={{ textAlign: "center", opacity: 0.7 }}>
            No open trades
          </Typography>
        )}

        <div className="space-y-2">
          {trades.map((t) => (
            <div
              key={`${t.trade_id}-${t.opened_at}`}
              className="
                rounded-lg
                border border-omega-dark-gold/40
                px-3 py-2
                flex flex-col gap-2
              "
            >
              {/* HEADER */}
              <div className="flex justify-between items-center">
                <div className="font-semibold">{t.symbol}</div>

                <div className="text-xs opacity-70">
                  {t.side} • Qty {fmt(t.qty)}
                </div>
              </div>

              {/* PRICE ROW */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex flex-col">
                  <span className="opacity-50">Entry</span>
                  <span className="font-semibold">£{fmt(t.entry_price)}</span>
                </div>

                <div className="flex flex-col">
                  <span className="opacity-50">SL</span>
                  <span className="font-semibold">
                    {t.sl != null ? `£${fmt(t.sl)}` : "—"}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="opacity-50">TP</span>
                  <span className="font-semibold">
                    {t.tp1 != null ? `£${fmt(t.tp1)}` : "—"}
                  </span>
                </div>
              </div>

              {/* META */}
              <div className="flex justify-between items-center text-[0.65rem] opacity-60">
                <div>
                  Opened{" "}
                  {new Date(t.opened_at).toLocaleString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "short",
                  })}
                </div>

                {t.rr != null && <div>R:R {fmt(t.rr)}</div>}
              </div>

              {/* PNL PLACEHOLDER */}
              <div className="text-right text-xs opacity-50">— unrealised</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
