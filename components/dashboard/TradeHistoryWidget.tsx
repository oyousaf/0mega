"use client";

import { useEffect, useState } from "react";
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

      // Correct source key for your API:
      setItems(json.history || json.trades || []);
    } catch (err) {
      console.error("Trade history load failed:", err);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  /* ---------------------------
      SAFE HELPERS
  ---------------------------- */

  const safeNum = (v: any) => {
    const n = Number(v);
    if (!isFinite(n)) return "—";
    return n.toFixed(2);
  };

  const safeDate = (d: any) => {
    if (!d) return "—";
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? "—" : dt.toLocaleString();
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
          Trade History
        </Typography>

        <Divider sx={{ borderColor: "var(--omega-dark-gold)", my: 2 }} />

        {items.length === 0 && <Typography>No trade activity</Typography>}

        {items.map((t) => {
          const isOpen = openRow === t.trade_id;

          const entry = Number(t.entry_fill_price ?? t.entry_price);
          const exit =
            t.exit_fill_price !== null ? Number(t.exit_fill_price) : null;

          const pl = t.realised_pl !== null ? Number(t.realised_pl) : null;

          return (
            <div
              key={t.trade_id}
              className="border-b border-omega-dark-gold/40 py-2"
            >
              {/* ---------------- HEADER ROW ---------------- */}
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setOpenRow(isOpen ? null : t.trade_id)}
              >
                <div>
                  <div className="font-bold">{t.symbol}</div>

                  <div className="text-sm opacity-70">
                    {t.side} • Qty {t.qty}
                  </div>

                  <div className="text-xs opacity-60 mt-1">
                    Entry: £{safeNum(entry)}
                    {exit !== null && <> • Exit: £{safeNum(exit)}</>}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm">{safeDate(t.opened_at)}</div>

                  {pl !== null && (
                    <div
                      className={`font-bold ${
                        pl >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      £{safeNum(pl)}
                    </div>
                  )}

                  <div className="flex justify-end mt-1">
                    {isOpen ? <FiChevronUp /> : <FiChevronDown />}
                  </div>
                </div>
              </div>

              {/* ---------------- EXECUTION PANEL ---------------- */}
              <Collapse in={isOpen}>
                <div className="mt-2 ml-2 text-sm opacity-80">
                  {t.executions.length === 0 && (
                    <div>No executions recorded</div>
                  )}

                  {t.executions.map((e) => (
                    <div
                      key={e.exec_id}
                      className="flex justify-between py-1 border-b border-omega-dark-gold/20"
                    >
                      <div>
                        {e.side} @ £{safeNum(e.price)}
                      </div>

                      <div className="text-right">
                        Qty {e.qty} • {e.broker ?? "paper"}
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
