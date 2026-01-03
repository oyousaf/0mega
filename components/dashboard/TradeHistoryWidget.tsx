"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
  Typography,
  Divider,
  Collapse,
} from "@mui/material";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { Trade } from "@/app/types/trade";

const PAGE_SIZE = 20;
const POLL_INTERVAL = 5000;

export default function TradeHistoryWidget() {
  const [items, setItems] = useState<Trade[]>([]);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  /* ---------------- FETCH PAGE ---------------- */

  async function loadPage(nextOffset = 0, append = false) {
    if (loadingMore) return;

    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/trading/history?limit=${PAGE_SIZE}&offset=${nextOffset}`,
        { cache: "no-store" }
      );

      const json = await res.json();
      const trades: Trade[] = Array.isArray(json.trades) ? json.trades : [];

      setItems((prev) => (append ? [...prev, ...trades] : trades));
      setHasMore(Boolean(json.hasMore));
      setOffset(nextOffset);
    } catch (err) {
      console.error("Trade history load failed:", err);
    } finally {
      setLoadingMore(false);
    }
  }

  /* ---------------- INITIAL LOAD + POLL ---------------- */

  useEffect(() => {
    loadPage(0, false);

    const id = setInterval(() => {
      loadPage(0, false);
    }, POLL_INTERVAL);

    return () => clearInterval(id);
  }, []);

  /* ---------------- SCROLL HANDLER ---------------- */

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      if (!hasMore || loadingMore) return;

      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
        loadPage(offset + PAGE_SIZE, true);
      }
    };

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [offset, hasMore, loadingMore]);

  /* ---------------- SAFE HELPERS ---------------- */

  const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const safeNum = (v: any) =>
    Number.isFinite(Number(v)) ? Number(v).toFixed(2) : "—";

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

  /* ---------------- RENDER ---------------- */

  return (
    <Card
      sx={{
        background: "var(--omega-green)",
        border: "1px solid var(--omega-dark-gold)",
        borderRadius: "1rem",
      }}
    >
      <CardContent sx={{ color: "var(--omega-gold)" }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Trade History
        </Typography>

        <div className="mt-2 text-sm flex justify-center gap-6 opacity-90">
          <span>Daily: £{pnlSummary.daily}</span>
          <span>Weekly: £{pnlSummary.weekly}</span>
          <span>Monthly: £{pnlSummary.monthly}</span>
        </div>

        <Divider sx={{ borderColor: "var(--omega-dark-gold)", my: 2 }} />

        {/* SCROLL CONTAINER — SCROLLBAR HIDDEN */}
        <div
          ref={containerRef}
          className="trade-history-scroll"
          style={{
            maxHeight: 520,
            overflowY: "auto",
            paddingRight: 6,
          }}
        >
          {items.map((t) => {
            const isOpen = openRow === t.trade_id;
            const entry = n(t.entry_fill_price ?? t.entry_price);
            const exit =
              t.exit_fill_price !== null ? n(t.exit_fill_price) : null;
            const pl = t.realised_pl !== null ? n(t.realised_pl) : null;

            const pnlPct =
              pl !== null ? ((pl / (entry * t.qty)) * 100).toFixed(2) : null;

            return (
              <div
                key={t.trade_id}
                className="border-b border-omega-dark-gold/40 py-2"
              >
                <div
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => setOpenRow(isOpen ? null : t.trade_id)}
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
                  </div>

                  <div className="text-right">
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
                    {isOpen ? <FiChevronUp /> : <FiChevronDown />}
                  </div>
                </div>

                <Collapse in={isOpen}>
                  <div className="mt-2 ml-2 text-sm opacity-80">
                    {t.executions.map((e) => (
                      <div
                        key={e.exec_id}
                        className="flex justify-between py-1 border-b border-omega-dark-gold/20"
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

          {loadingMore && (
            <div className="text-center py-3 text-sm opacity-60">
              Loading more…
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
