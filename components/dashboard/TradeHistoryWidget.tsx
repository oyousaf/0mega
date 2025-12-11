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

export default function TradeHistoryWidget() {
  const [items, setItems] = useState([]);
  const [openRow, setOpenRow] = useState<string | null>(null);

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

        {items.map((t: any) => {
          const isOpen = openRow === t.trade_id;
          const pl = t.realised_pl !== null ? Number(t.realised_pl) : null;

          return (
            <div
              key={t.trade_id}
              className="border-b border-omega-dark-gold/40 py-2"
            >
              {/* Row Header */}
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setOpenRow(isOpen ? null : t.trade_id)}
              >
                <div>
                  <div className="font-bold">{t.symbol}</div>
                  <div className="text-sm opacity-70">
                    {t.trade_side} • Qty {t.trade_qty}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm">
                    {new Date(t.opened_at).toLocaleString()}
                  </div>

                  {pl !== null && (
                    <div
                      className={`font-bold ${
                        pl >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      £{pl.toFixed(2)}
                    </div>
                  )}

                  <div className="flex justify-end mt-1">
                    {isOpen ? <FiChevronUp /> : <FiChevronDown />}
                  </div>
                </div>
              </div>

              {/* Executions Panel */}
              <Collapse in={isOpen}>
                <div className="mt-2 ml-2 text-sm opacity-80">
                  {t.executions.length === 0 && (
                    <div>No executions recorded</div>
                  )}

                  {t.executions.map((e: any) => (
                    <div
                      key={e.exec_id}
                      className="flex justify-between py-1 border-b border-omega-dark-gold/20"
                    >
                      <div>
                        {e.side} @ £{Number(e.price).toFixed(2)}
                      </div>
                      <div>
                        Qty {e.qty} • {e.broker}
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
