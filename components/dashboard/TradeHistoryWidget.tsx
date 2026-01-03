"use client";

import { useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  Typography,
  Divider,
  Collapse,
} from "@mui/material";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { Trade } from "@/app/types/trade";
import { usePnlSummary } from "@/hooks/usePnlSummary";

const PAGE_SIZE = 20;
const POLL_INTERVAL = 5000;

export default function TradeHistoryWidget() {
  const [items, setItems] = useState<Trade[]>([]);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  /* ---------------- SERVER-SIDE SUMMARY ---------------- */

  const pnlSummary = usePnlSummary(POLL_INTERVAL);

  /* ---------------- DEDUPE MERGE ---------------- */

  function mergeTrades(prev: Trade[], next: Trade[]) {
    const map = new Map<string, Trade>();
    for (const t of prev) {
      map.set(`${t.trade_id}-${t.opened_at}`, t);
    }
    for (const t of next) {
      map.set(`${t.trade_id}-${t.opened_at}`, t);
    }
    return Array.from(map.values());
  }

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

      setItems((prev) => {
        if (!append) return trades;
        return mergeTrades(prev, trades);
      });

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
      loadPage(0, false); // refresh first page only
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
        <h2 className="text-xl font-semibold text-omega-gold mb-1">
          📜 Trade History
        </h2>

        {/* SUMMARY — SERVER TRUTH */}
        <Typography
          sx={{
            mt: 1,
            fontSize: 13,
            display: "flex",
            justifyContent: "center",
            gap: 3,
            opacity: 0.9,
            color: "var(--omega-gold)",
            letterSpacing: "0.02em",
          }}
        >
          <span>Daily: £{pnlSummary.daily.toFixed(2)}</span>
          <span>Weekly: £{pnlSummary.weekly.toFixed(2)}</span>
          <span>Monthly: £{pnlSummary.monthly.toFixed(2)}</span>
        </Typography>

        <Divider sx={{ borderColor: "var(--omega-dark-gold)", my: 2 }} />

        {/* SCROLL CONTAINER */}
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
                key={`${t.trade_id}-${t.opened_at}`}
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

          {!hasMore && items.length > 0 && (
            <div className="text-center py-3 text-xs opacity-50">
              End of history
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
