"use client";

import { Button, Modal } from "@mui/material";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useState, useMemo } from "react";

import { Trade } from "@/app/types/trade";
import { computeMetricsFromTrades } from "@/lib/metrics";
import { buildEquityAndDrawdown } from "@/lib/analytics/equity";

import DashboardHeader from "./DashboardHeader";
import NotificationsPanel from "@/app/dashboard/NotificationsPanel";
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
    } catch {}
  }

  useEffect(() => {
    loadHistory();
    const id = setInterval(loadHistory, 5000);
    return () => clearInterval(id);
  }, []);

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

  return (
    <>
      {/* SETTINGS MODAL */}
      <Modal open={openSettings} onClose={() => setOpenSettings(false)}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute top-1/2 left-1/2 w-[90%] max-w-lg -translate-x-1/2 -translate-y-1/2
            bg-omega-green border border-neutral-700 rounded-xl p-6 shadow-xl"
        >
          <h2 className="text-2xl font-semibold text-omega-gold mb-4 text-center">
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

      {/* HEADER */}
      <DashboardHeader onOpenSettings={() => setOpenSettings(true)} />

      {/* CONTENT */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="px-2 sm:px-4 pb-[env(safe-area-inset-bottom)]
          space-y-4 sm:space-y-6"
      >
        <TodayStatusWidget />
        <MetricsCards metrics={metrics} />
        <ForwardTestReview trades={history} />
        <OpenTradesWidget />

        <ChartWrapper height={300}>
          <PerformanceChart
            data={equitySeries.map((e) => ({
              date: e.date,
              cumulative: e.equity,
            }))}
          />
        </ChartWrapper>

        <ChartWrapper height={220}>
          <DrawdownChart
            data={equitySeries.map((e) => ({
              date: e.date,
              drawdown: e.drawdown,
            }))}
          />
        </ChartWrapper>

        <div className="flex justify-center">
          <div
            className="px-4 py-1 rounded-lg text-xs font-bold tracking-widest
            border border-omega-dark-gold text-omega-gold bg-black/25"
          >
            LAST UPDATED: {lastUpdated}
          </div>
        </div>

        <StrategyMiniCards trades={history} />
        <StrategyLeaderboard trades={history} />
        <SymbolLeaderboard trades={history} />
        <MarketBreakdown trades={history} />
        <HalaalTracker trades={history} />
        <TradeHistoryWidget />
      </motion.main>
    </>
  );
}
