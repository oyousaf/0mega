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
  const [openRow, setOpenRow] = useState<number | null>(null);

  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const pnlSummary = usePnlSummary(POLL_INTERVAL);

  /* ---------------------------------------------
     Helpers
  --------------------------------------------- */
  const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const fmt = (v: unknown) =>
    Number.isFinite(Number(v)) ? Number(v).toFixed(2) : "—";

  const fmtDate = (d: unknown) => {
    const dt = new Date(String(d));
    return isNaN(dt.getTime()) ? "—" : dt.toLocaleString();
  };

  function mergeTrades(prev: Trade[], next: Trade[]) {
    const map = new Map<number, Trade>();
    for (const t of prev) map.set(t.trade_id, t);
    for (const t of next) map.set(t.trade_id, t);
    return Array.from(map.values());
  }

  /* ---------------------------------------------
     Data loading
  --------------------------------------------- */
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

      setItems((prev) => (append ? mergeTrades(prev, trades) : trades));
      setHasMore(Boolean(json.hasMore));
      setOffset(nextOffset);
    } catch (err) {
      console.error("Trade history load failed:", err);
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    loadPage(0, false);
    const id = setInterval(() => loadPage(0, false), POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

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

  /* ---------------------------------------------
     Render
  --------------------------------------------- */
  return (
    <Card
      sx={{
        background: "var(--omega-green)",
        border: "1px solid var(--omega-dark-gold)",
        borderRadius: "1rem",
      }}
    >
      <CardContent sx={{ color: "var(--omega-gold)", p: 2 }}>
        <h2 className="text-lg font-semibold text-omega-gold text-center mb-1">
          📜 Trade History
        </h2>

        <Typography
          sx={{
            mt: 0.5,
            fontSize: 12,
            display: "flex",
            justifyContent: "center",
            gap: 2,
            opacity: 0.9,
            color: "var(--omega-gold)",
          }}
        >
          <span>Daily £{fmt(pnlSummary?.daily)}</span>
          <span>Weekly £{fmt(pnlSummary?.weekly)}</span>
          <span>Monthly £{fmt(pnlSummary?.monthly)}</span>
        </Typography>

        <Divider sx={{ borderColor: "var(--omega-dark-gold)", my: 1.5 }} />

        {/* SCROLL CONTAINER */}
        <div
          ref={containerRef}
          className="trade-history-scroll"
          style={{ maxHeight: 520, paddingRight: 6 }}
        >
          {items.map((t) => {
            const isOpen = openRow === t.trade_id;
            const entry = n(t.entry_price);
            const pl = t.realised_pl != null ? n(t.realised_pl) : null;

            const pnlPct =
              pl != null && entry > 0 && t.qty > 0
                ? ((pl / (entry * t.qty)) * 100).toFixed(2)
                : null;

            return (
              <div
                key={t.trade_id}
                className="border-b border-omega-dark-gold/30 py-2"
              >
                <div
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => setOpenRow(isOpen ? null : t.trade_id)}
                >
                  <div>
                    <div className="font-bold">{t.symbol}</div>
                    <div className="text-xs opacity-70">
                      {t.side} • Qty {t.qty}
                    </div>
                  </div>

                  <div className="text-right">
                    {pl != null && (
                      <div
                        className={`font-bold ${
                          pl >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        £{fmt(pl)}
                        {pnlPct && (
                          <span className="ml-1 text-xs opacity-70">
                            ({pnlPct}%)
                          </span>
                        )}
                      </div>
                    )}
                    {isOpen ? <FiChevronUp /> : <FiChevronDown />}
                  </div>
                </div>

                <Collapse in={isOpen}>
                  <div className="mt-2 text-xs opacity-80">
                    {(t.executions ?? []).map((e) => (
                      <div
                        key={e.exec_id}
                        className="flex justify-between py-1 border-b border-omega-dark-gold/20"
                      >
                        <div>
                          {e.side} @ £{fmt(e.price)}
                        </div>
                        <div className="text-right">
                          Qty {e.qty} • {e.broker}
                          <br />
                          <span className="opacity-60">{fmtDate(e.time)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Collapse>
              </div>
            );
          })}

          {loadingMore && (
            <div className="text-center py-2 text-xs opacity-60">Loading…</div>
          )}

          {!hasMore && items.length > 0 && (
            <div className="text-center py-2 text-xs opacity-50">
              End of history
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
