"use client";

import { Button, Modal } from "@mui/material";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useState, useMemo } from "react";

import { Trade } from "@/app/types/trade";
import { computeMetricsFromTrades } from "@/lib/metrics";
import { buildEquityAndDrawdown } from "@/lib/analytics/equity";

import NotificationsPanel from "@/components/settings/NotificationsPanel";
import MetricsCards from "@/components/dashboard/MetricsCards";

import StrategyLeaderboard from "@/components/dashboard/analytics/StrategyLeaderboard";
import SymbolLeaderboard from "@/components/dashboard/analytics/SymbolLeaderboard";
import StrategyMiniCards from "@/components/dashboard/analytics/StrategyMiniCards";
import HalaalTracker from "@/components/dashboard/analytics/HalaalTracker";
import MarketBreakdown from "@/components/dashboard/analytics/MarketBreakdown";
import ForwardTestReview from "@/components/dashboard/analytics/ForwardTestReview";

import ChartWrapper from "@/components/layout/ChartWrapper";
import OpenTradesWidget from "@/components/dashboard/OpenTradesWidget";
import TradeHistoryWidget from "@/components/dashboard/TradeHistoryWidget";
import TodayStatusWidget from "@/components/dashboard/TodayStatusWidget";

const PerformanceChart = dynamic(
  () => import("@/components/charts/PerformanceChart"),
  { ssr: false }
);

const DrawdownChart = dynamic(
  () => import("@/components/charts/DrawdownChart"),
  { ssr: false }
);

export default function DashboardClient() {
  const [history, setHistory] = useState<Trade[]>([]);
  const [openSettings, setOpenSettings] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");

  /* ----------------------------------------------------------
     LOAD FULL HISTORY (ANALYTICS TRUTH)
  ---------------------------------------------------------- */
  async function loadHistory() {
    try {
      const res = await fetch("/api/trading/history?analytics=1&limit=10000", {
        cache: "no-store",
      });

      const json = await res.json();
      setHistory(Array.isArray(json.trades) ? json.trades : []);

      setLastUpdated(
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } catch (err) {
      console.error("Failed to load trade history", err);
    }
  }

  useEffect(() => {
    loadHistory();
    const id = setInterval(loadHistory, 5000);
    return () => clearInterval(id);
  }, []);

  /* ----------------------------------------------------------
     EQUITY + DRAWDOWN (CLOSED TRADES ONLY)
  ---------------------------------------------------------- */
  const equitySeries = useMemo(() => {
    const closed = history.filter(
      (t) => t.is_closed && t.closed_at && t.realised_pl !== null
    );

    return buildEquityAndDrawdown(
      closed.map((t) => ({
        closed_at: t.closed_at!,
        realised_pl: Number(t.realised_pl) || 0,
      }))
    );
  }, [history]);

  const metrics = computeMetricsFromTrades(history);

  /* ----------------------------------------------------------
     RENDER
  ---------------------------------------------------------- */
  return (
    <>
      {/* SETTINGS PANEL */}
      <Modal open={openSettings} onClose={() => setOpenSettings(false)}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute top-1/2 left-1/2 w-[90%] max-w-lg -translate-x-1/2 -translate-y-1/2 bg-omega-green border border-neutral-700 rounded-xl p-6 shadow-xl"
        >
          <h2 className="text-2xl font-semibold text-omega-gold mb-4">
            Settings
          </h2>

          <NotificationsPanel />

          <div className="text-right mt-6">
            <Button
              onClick={() => setOpenSettings(false)}
              sx={{
                backgroundColor: "var(--omega-gold)",
                color: "var(--omega-green)",
              }}
            >
              Close
            </Button>
          </div>
        </motion.div>
      </Modal>

      {/* MAIN DASHBOARD */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto text-center p-6 space-y-10"
      >
        <motion.h1
          className="text-3xl font-semibold text-omega-gold"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          𝛀mega
        </motion.h1>

        {/* SYSTEM & RISK */}
        <TodayStatusWidget />

        {/* PERFORMANCE SNAPSHOT */}
        <MetricsCards metrics={metrics} />

        {/* FORWARD-TEST REVIEW */}
        <ForwardTestReview trades={history} />

        {/* LIVE EXPOSURE */}
        <OpenTradesWidget />

        {/* EQUITY */}
        <ChartWrapper height={300}>
          <PerformanceChart
            data={equitySeries.map((e) => ({
              date: e.date,
              cumulative: e.equity,
            }))}
          />
        </ChartWrapper>

        {/* DRAWDOWN */}
        <ChartWrapper height={220}>
          <DrawdownChart
            data={equitySeries.map((e) => ({
              date: e.date,
              drawdown: e.drawdown,
            }))}
          />
        </ChartWrapper>

        <div className="flex justify-center mt-2">
          <div
            className="px-4 py-1 rounded-lg text-xs font-bold tracking-widest"
            style={{
              background: "rgba(0,0,0,0.25)",
              border: "1px solid var(--omega-dark-gold)",
              color: "var(--omega-gold)",
            }}
          >
            LAST UPDATED: {lastUpdated}
          </div>
        </div>

        {/* BEHAVIOUR */}
        <StrategyMiniCards trades={history} />

        {/* ANALYTICS */}
        <StrategyLeaderboard trades={history} />
        <SymbolLeaderboard trades={history} />
        <MarketBreakdown trades={history} />

        {/* COMPLIANCE */}
        <HalaalTracker trades={history} />

        {/* FORENSICS */}
        <TradeHistoryWidget />
      </motion.main>
    </>
  );
}
