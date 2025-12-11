"use client";

import {
  Box,
  Button,
  MenuItem,
  Select,
  SelectChangeEvent,
  Modal,
} from "@mui/material";

import { motion } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState, useMemo } from "react";
import { FiActivity, FiFolder, FiPlusCircle, FiSettings } from "react-icons/fi";

import { computeMetrics } from "@/lib/metrics";
import RecentSignals from "@/components/dashboard/RecentSignals";
import { Signal } from "@/app/types/signal";
import NotificationsPanel from "@/components/settings/NotificationsPanel";
import MetricsCards from "@/components/dashboard/MetricsCards";

import StrategyLeaderboard from "@/components/dashboard/analytics/StrategyLeaderboard";
import SymbolLeaderboard from "@/components/dashboard/analytics/SymbolLeaderboard";
import StrategyMiniCards from "@/components/dashboard/analytics/StrategyMiniCards";
import HalaalTracker from "@/components/dashboard/analytics/HalaalTracker";
import MarketBreakdown from "@/components/dashboard/analytics/MarketBreakdown";

import ChartWrapper from "@/components/layout/ChartWrapper";
import OpenTradesWidget from "@/components/dashboard/OpenTradesWidget";
import TradeHistoryWidget from "@/components/dashboard/TradeHistoryWidget";

const PerformanceChart = dynamic(
  () => import("@/components/charts/PerformanceChart"),
  { ssr: false }
);

const menuProps = {
  PaperProps: {
    sx: {
      backgroundColor: "var(--omega-green)",
      border: "1px solid var(--omega-dark-gold)",
      borderRadius: "0.75rem",
      color: "var(--omega-gold)",
      "& .MuiMenuItem-root": { color: "var(--omega-gold)", fontWeight: 600 },
      "& .MuiMenuItem-root.Mui-selected": {
        backgroundColor: "rgba(212,175,55,0.15)",
      },
      "& .MuiMenuItem-root:hover": { backgroundColor: "rgba(212,175,55,0.25)" },
    },
  },
};

export default function DashboardClient({
  initialSignals,
  recentSignals,
}: {
  initialSignals: Signal[];
  recentSignals: Signal[];
}) {
  const [allSignals, setAllSignals] = useState(initialSignals);

  const [range, setRange] = useState<"hour" | "day" | "week">("day");
  const [symbolFilter, setSymbolFilter] = useState("all");
  const [marketFilter, setMarketFilter] = useState("all");

  const [openSettings, setOpenSettings] = useState(false);
  const [metrics, setMetrics] = useState(() => computeMetrics(initialSignals));
  const [lastUpdated, setLastUpdated] = useState("");

  const [history, setHistory] = useState<any[]>([]);

  /* ----------------------------------------------------------
     LOAD TRADE HISTORY (SOURCE OF TRUTH FOR ANALYTICS)
  ---------------------------------------------------------- */
  async function loadHistory() {
    const res = await fetch("/api/trading/history?limit=500&offset=0", {
      cache: "no-store",
    });
    const json = await res.json();
    setHistory(json.history || []);
  }

  useEffect(() => {
    loadHistory();
    const id = setInterval(loadHistory, 5000);
    return () => clearInterval(id);
  }, []);

  /* ----------------------------------------------------------
     SIGNAL AUTO REFRESH
  ---------------------------------------------------------- */
  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await fetch("/api/dashboard-signals");
        const data = await res.json();

        if (Array.isArray(data.signals)) {
          setAllSignals(data.signals);
          setMetrics(computeMetrics(data.signals));

          const now = new Date();
          setLastUpdated(
            now.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })
          );
        }
      } catch {}
    };

    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, []);

  /* ----------------------------------------------------------
     EQUITY CURVE
  ---------------------------------------------------------- */
  const equityData = useMemo(() => {
    if (!history.length) return [];

    const closed = history
      .filter((t) => t.realised_pl !== null)
      .sort(
        (a, b) =>
          new Date(a.opened_at).getTime() - new Date(b.opened_at).getTime()
      );

    let cumulative = 0;

    return closed.map((t) => {
      cumulative += Number(t.realised_pl);
      return {
        date: new Date(t.opened_at).toISOString(),
        cumulative,
      };
    });
  }, [history]);

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
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
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
        className="max-w-7xl mx-auto text-center p-6 space-y-10 block"
      >
        {/* TITLE */}
        <motion.h1
          className="text-3xl font-semibold text-omega-gold"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          𝛀mega Dashboard
        </motion.h1>

        {/* NAV BUTTONS */}
        <Box className="flex justify-end items-center gap-3 mt-2 pr-2">
          <Link href="/signals/active">
            <Button
              sx={{
                backgroundColor: "var(--omega-gold)",
                color: "var(--omega-green)",
              }}
            >
              📡 Active
            </Button>
          </Link>

          <Link href="/signals/all">
            <Button
              sx={{
                backgroundColor: "var(--omega-gold)",
                color: "var(--omega-green)",
              }}
            >
              📁 All
            </Button>
          </Link>

          <Link href="/signals/new">
            <Button
              sx={{
                backgroundColor: "var(--omega-gold)",
                color: "var(--omega-green)",
              }}
            >
              ➕ New
            </Button>
          </Link>

          <motion.button
            onClick={() => setOpenSettings(true)}
            whileHover={{ rotate: 90, scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 250 }}
            className="p-2 rounded-full bg-omega-dark-gold text-omega-green"
          >
            <FiSettings size={22} />
          </motion.button>
        </Box>

        {/* SIGNAL METRICS */}
        <MetricsCards metrics={metrics} />

        {/* OPEN TRADES */}
        <OpenTradesWidget />

        {/* TRADE HISTORY */}
        <TradeHistoryWidget />

        {/* EQUITY CHART */}
        <ChartWrapper height={300}>
          <PerformanceChart data={equityData} trades={history} />
        </ChartWrapper>

        {/* LAST UPDATED */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex justify-center mt-2"
        >
          <div
            className="px-4 py-1 rounded-lg text-xs font-bold tracking-widest"
            style={{
              background: "rgba(0,0,0,0.25)",
              border: "1px solid var(--omega-dark-gold)",
              color: "var(--omega-gold)",
              boxShadow: "0 0 10px rgba(212,175,55,0.15)",
            }}
          >
            LAST UPDATED: {lastUpdated}
          </div>
        </motion.div>

        {/* STRATEGY + SYMBOL ANALYTICS */}
        <StrategyMiniCards trades={history} />
        <StrategyLeaderboard trades={history} />
        <SymbolLeaderboard trades={history} />

        <HalaalTracker trades={history} />

        <ChartWrapper height={300}>
          <MarketBreakdown trades={history} />
        </ChartWrapper>

        {/* RECENT SIGNALS */}
        <RecentSignals signals={recentSignals} />
      </motion.main>
    </>
  );
}
