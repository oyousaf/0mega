"use client";

import { Button, Modal } from "@mui/material";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useState, useMemo } from "react";
import { FiHome, FiSettings, FiCpu } from "react-icons/fi";

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
          className="absolute top-1/2 left-1/2 w-[90%] max-w-lg
            -translate-x-1/2 -translate-y-1/2
            bg-omega-green border border-neutral-700
            rounded-xl p-6 shadow-xl"
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

      {/* DASHBOARD */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-7xl mx-auto p-6 space-y-10 text-center"
      >
        {/* HEADER */}
        <div
          className="sticky top-0 z-50 grid grid-cols-3 items-center
          rounded-xl px-4 py-3 backdrop-blur bg-omega-green/70
          border border-omega-dark-gold"
        >
          <div />

          {/* TITLE */}
          <motion.h1
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="text-2xl sm:text-3xl font-semibold text-omega-gold
              cursor-pointer select-none text-center"
          >
            𝛀mega
          </motion.h1>

          {/* ACTIONS */}
          <div className="flex justify-end gap-2">
            {/* HOME */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="Scroll to top"
              className="w-9 h-9 flex items-center justify-center rounded-full
                border border-omega-dark-gold text-omega-gold
                bg-transparent hover:bg-omega-dark-gold/10 transition"
            >
              <FiHome size={16} />
            </motion.button>

            {/* AUTOMATION STATUS */}
            <div
              title="Automation running"
              className="w-9 h-9 flex items-center justify-center rounded-full
                border border-omega-dark-gold text-omega-gold
                bg-transparent opacity-80"
            >
              <FiCpu size={16} />
            </div>

            {/* SETTINGS */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setOpenSettings(true)}
              aria-label="Settings"
              className="w-9 h-9 flex items-center justify-center rounded-full
                border border-omega-dark-gold text-omega-gold
                bg-transparent hover:bg-omega-dark-gold/10 transition"
            >
              <FiSettings size={16} />
            </motion.button>
          </div>
        </div>

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
