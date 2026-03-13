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

import { Trade } from "@/types/trade";
import { useDashboard, DashboardPayload } from "@/hooks/useDashboard";
import { fmtPrice, fmtQty, fmtPnL } from "@/lib/format";

const PAGE_SIZE = 20;

/* ---------------------------------------
SAFE NUMBER
--------------------------------------- */

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function cleanZero(n: number) {
  return Math.abs(n) < 0.000001 ? 0 : n;
}

/* ---------------------------------------
FOREX RETURN %
--------------------------------------- */

function pnlPercent(pl: number, risk: number | null | undefined) {
  const r = Number(risk);
  if (!Number.isFinite(r) || r <= 0) return null;
  return cleanZero((pl / r) * 100);
}

export default function TradeHistoryWidget() {
  const dashboard = useDashboard(15000) as DashboardPayload | null;

  const [items, setItems] = useState<Trade[]>([]);
  const [openRow, setOpenRow] = useState<number | null>(null);

  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const fmtDate = (d: unknown) => {
    const dt = new Date(String(d));
    return isNaN(dt.getTime()) ? "—" : dt.toLocaleString("en-GB");
  };

  /* ---------------------------------------
INITIAL DASHBOARD LOAD
--------------------------------------- */

  useEffect(() => {
    if (!dashboard?.tradeHistory) return;
    setItems(dashboard.tradeHistory as Trade[]);
  }, [dashboard]);

  /* ---------------------------------------
LOAD MORE HISTORY
--------------------------------------- */

  async function loadMore() {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);

    try {
      const res = await fetch(
        `/api/trading/history?limit=${PAGE_SIZE}&offset=${offset + PAGE_SIZE}`,
        { cache: "no-store" },
      );

      const json = await res.json();
      const trades: Trade[] = Array.isArray(json.trades) ? json.trades : [];

      setItems((prev) => [...prev, ...trades]);
      setHasMore(Boolean(json.hasMore));
      setOffset((o) => o + PAGE_SIZE);
    } catch (err) {
      console.error("Trade history load failed:", err);
    } finally {
      setLoadingMore(false);
    }
  }

  /* ---------------------------------------
INFINITE SCROLL
--------------------------------------- */

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      if (!hasMore || loadingMore) return;

      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
        loadMore();
      }
    };

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [offset, hasMore, loadingMore]);

  const pnlSummary = dashboard?.pnlSummary ?? {
    daily: 0,
    weekly: 0,
    monthly: 0,
  };

  /* ---------------------------------------
UI
--------------------------------------- */

  return (
    <Card
      sx={{
        background: "var(--omega-green)",
        border: "1px solid var(--omega-dark-gold)",
        borderRadius: "1rem",
      }}
    >
      <CardContent sx={{ color: "var(--omega-gold)", p: 2 }}>
        {" "}
        <h2 className="text-xl font-semibold text-omega-gold text-center mb-1">
          📜 Trade History{" "}
        </h2>
        <Typography
          sx={{
            mt: 0.5,
            fontSize: 15,
            display: "flex",
            justifyContent: "center",
            gap: 2,
            opacity: 0.9,
            color: "var(--omega-gold)",
          }}
        >
          <span>Daily {fmtPnL(pnlSummary.daily)}</span>
          <span>Weekly {fmtPnL(pnlSummary.weekly)}</span>
          <span>Monthly {fmtPnL(pnlSummary.monthly)}</span>
        </Typography>
        <Divider sx={{ borderColor: "var(--omega-dark-gold)", my: 1.5 }} />
        <div
          ref={containerRef}
          className="trade-history-scroll"
          style={{ maxHeight: 520, paddingRight: 6 }}
        >
          {items.map((t, index) => {
            const tradeId = Number((t as any).id ?? index);
            const isOpen = openRow === tradeId;

            const pl =
              t.realised_pl != null ? cleanZero(num(t.realised_pl)) : null;

            const pnlPct =
              pl !== null ? pnlPercent(pl, (t as any).risk_amount) : null;

            return (
              <div
                key={`trade-${tradeId}-${t.closed_at ?? index}`}
                className="border-b border-omega-dark-gold/30 py-2"
              >
                {/* HEADER */}

                <div
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => setOpenRow(isOpen ? null : tradeId)}
                >
                  <div>
                    <div className="font-bold">{t.symbol}</div>

                    <div className="text-xs opacity-70">
                      {t.side} • Qty {fmtQty(t.qty)}
                    </div>
                  </div>

                  <div className="text-right">
                    {pl !== null && (
                      <div
                        className={`font-bold ${
                          pl >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {fmtPnL(pl)}

                        {pnlPct !== null && (
                          <span className="ml-1 text-xs opacity-70">
                            ({fmtPrice(pnlPct)}%)
                          </span>
                        )}
                      </div>
                    )}

                    {isOpen ? <FiChevronUp /> : <FiChevronDown />}
                  </div>
                </div>

                {/* DETAILS */}

                <Collapse in={isOpen}>
                  <div className="mt-2 text-xs opacity-80 space-y-1">
                    <div className="flex justify-between">
                      <span>Entry</span>
                      <span>{fmtPrice(t.entry_price, t.symbol)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Exit</span>
                      <span>
                        {t.exit_price ? fmtPrice(t.exit_price, t.symbol) : "—"}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>SL</span>
                      <span>{fmtPrice(t.sl, t.symbol)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>TP</span>
                      <span>{fmtPrice(t.tp1, t.symbol)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Result</span>
                      <span>{(t as any).exit_reason ?? "—"}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Opened</span>
                      <span>{fmtDate(t.opened_at)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Closed</span>
                      <span>{fmtDate(t.closed_at)}</span>
                    </div>

                    {(t as any).executions?.length > 0 && (
                      <>
                        <Divider
                          sx={{ borderColor: "var(--omega-dark-gold)" }}
                        />

                        {(t as any).executions.map((e: any, i: number) => (
                          <div
                            key={`exec-${tradeId}-${e.exec_id ?? i}`}
                            className="flex justify-between py-1 border-b border-omega-dark-gold/20"
                          >
                            <div>
                              {e.side} @ {fmtPrice(e.price, t.symbol)}
                            </div>

                            <div className="text-right">
                              Qty {fmtQty(e.qty)} • {e.broker}
                              <br />
                              <span className="opacity-60">
                                {fmtDate(e.timestamp ?? e.time)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
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
