"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  Typography,
  Divider,
  Collapse,
} from "@mui/material";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { Trade } from "@/app/types/trade";

export default function TradeHistoryWidget() {
  const [items, setItems] = useState<Trade[]>([]);
  const [openRow, setOpenRow] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/trading/history?limit=500&offset=0", {
        cache: "no-store",
      });

      const json = await res.json();
      setItems(Array.isArray(json.trades) ? json.trades : []);
    } catch (err) {
      console.error("Trade history load failed:", err);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  /* --------------------- SAFE HELPERS --------------------- */

  const n = (v: any) => {
    const x = Number(v);
    return isFinite(x) ? x : 0;
  };

  const safeNum = (v: any) => {
    const x = Number(v);
    return isFinite(x) ? x.toFixed(2) : "—";
  };

  const safeDate = (d: any) => {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? "—" : dt.toLocaleString();
  };

  /* ---------------- PNL SUMMARY ---------------- */

  const pnlSummary = useMemo(() => {
    const today = new Date().toDateString();
    const now = new Date();

    let daily = 0;
    let weekly = 0;
    let monthly = 0;

    for (const t of items) {
      if (!t.realised_pl || !t.closed_at) continue;

      const pl = n(t.realised_pl);
      const closed = new Date(t.closed_at);

      if (closed.toDateString() === today) daily += pl;

      const diffDays = (now.getTime() - closed.getTime()) / 86400000;
      if (diffDays <= 7) weekly += pl;
      if (diffDays <= 30) monthly += pl;
    }

    return {
      daily: daily.toFixed(2),
      weekly: weekly.toFixed(2),
      monthly: monthly.toFixed(2),
    };
  }, [items]);

  /* --------------------- RENDER --------------------- */

  return (
    <Card
      sx={{
        background: "var(--omega-green)",
        border: "1px solid var(--omega-dark-gold)",
        borderRadius: "1rem",
      }}
    >
      <CardContent sx={{ color: "var(--omega-gold)" }}>
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, color: "var(--omega-gold)" }}
        >
          Trade History
        </Typography>

        {/* SUMMARY */}
        <div className="mt-2 text-sm flex justify-center gap-6 opacity-90 text-omega-gold">
          <span>Daily: £{pnlSummary.daily}</span>
          <span>Weekly: £{pnlSummary.weekly}</span>
          <span>Monthly: £{pnlSummary.monthly}</span>
        </div>

        <Divider sx={{ borderColor: "var(--omega-dark-gold)", my: 2 }} />

        {items.length === 0 && (
          <Typography sx={{ color: "var(--omega-gold)" }}>
            No trade activity
          </Typography>
        )}

        {items.map((t) => {
          const isOpen = openRow === t.trade_id;

          const entry = n(t.entry_fill_price ?? t.entry_price);
          const exit = t.exit_fill_price !== null ? n(t.exit_fill_price) : null;
          const pl = t.realised_pl !== null ? n(t.realised_pl) : null;

          const pnlPct =
            pl !== null ? ((pl / (entry * t.qty)) * 100).toFixed(2) : null;

          return (
            <div
              key={t.trade_id}
              className="
                border-b border-omega-dark-gold/40 py-2
                text-omega-gold
              "
            >
              {/* HEADER */}
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setOpenRow(isOpen ? null : t.trade_id)}
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
                    {exit !== null && <> • Exit: £{safeNum(exit)}</>}
                    {t.rr !== null && (
                      <span className="ml-2 text-omega-gold">
                        R:R {safeNum(t.rr)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm opacity-70">
                    {safeDate(t.opened_at)}
                  </div>

                  {pl !== null && (
                    <div
                      className={`font-bold ${
                        pl >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      £{safeNum(pl)}{" "}
                      <span className="opacity-70 text-xs">({pnlPct}%)</span>
                    </div>
                  )}

                  <div className="flex justify-end mt-1 text-omega-gold">
                    {isOpen ? <FiChevronUp /> : <FiChevronDown />}
                  </div>
                </div>
              </div>

              {/* EXECUTIONS */}
              <Collapse in={isOpen}>
                <div className="mt-2 ml-2 text-sm opacity-80 text-omega-gold">
                  {t.executions.length === 0 && (
                    <div>No executions available</div>
                  )}

                  {t.executions.map((e) => (
                    <div
                      key={e.exec_id}
                      className="
                        flex justify-between py-1
                        border-b border-omega-dark-gold/20
                        text-omega-gold
                      "
                    >
                      <div>
                        {e.side} @ £{safeNum(e.price)}
                      </div>

                      <div className="text-right">
                        Qty {e.qty} • {e.broker}
                        <br />
                        <span className="opacity-60 text-xs">
                          {safeDate(e.time)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Collapse>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
