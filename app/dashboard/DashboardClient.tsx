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
import SymbolLeaderboard from "@/app/analytics/SymbolLeaderboard";
import StrategyLeaderboard from "../analytics/StrategyLeaderboard";
import { buildEquityCurve } from "@/lib/analytics/equityCurve";
import StrategyMiniCards from "../analytics/StrategyMiniCards";
import HalaalTracker from "../analytics/HalaalTracker";
import MarketBreakdown from "../analytics/MarketBreakdown";
import ChartWrapper from "@/components/layout/ChartWrapper";
import OpenTradesWidget from "@/components/dashboard/OpenTradesWidget";
import TradeHistoryWidget from "@/components/dashboard/TradeHistoryWidget";

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

const PerformanceChart = dynamic(
  () => import("@/components/charts/PerformanceChart"),
  { ssr: false }
);

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

  // ----------------------------------------------------
  // AUTO REFRESH
  // ----------------------------------------------------
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

  // ----------------------------------------------------
  // EQUITY CURVE
  // ----------------------------------------------------
  const equityData = useMemo(() => {
    const filtered = allSignals.filter((s) => {
      if (symbolFilter !== "all" && s.symbol !== symbolFilter) return false;
      if (marketFilter !== "all" && s.type !== marketFilter) return false;
      return true;
    });

    const curve = buildEquityCurve(filtered);

    return curve.map((p) => ({
      date: p.date.toISOString(),
      cumulative: p.cumulative,
    }));
  }, [allSignals, symbolFilter, marketFilter]);

  const symbolList = Array.from(
    new Set(allSignals.map((s) => s.symbol))
  ).sort();

  // ----------------------------------------------------
  // RENDER
  // ----------------------------------------------------
  return (
    <>
      {/* SETTINGS MODAL */}
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

      {/* ROOT DASHBOARD */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto text-center p-6 space-y-10 block"
        style={{
          display: "block",
          width: "100%",
        }}
      >
        {/* HEADER */}
        <motion.h1
          className="text-3xl font-semibold text-omega-gold"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          𝛀mega Dashboard
        </motion.h1>

        {/* TOP NAV BUTTONS */}
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

        {/* METRICS CARDS */}
        <MetricsCards metrics={metrics} />

        {/* OPEN TRADES */}
        <OpenTradesWidget />

        {/* OPEN TRADES */}
        <TradeHistoryWidget />

        {/* FILTER BAR */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            mt: 2,
            p: 1.2,
            borderRadius: "0.75rem",
            background: "var(--omega-green)",
            border: "1px solid var(--omega-dark-gold)",
            boxShadow: "0 0 12px rgba(212,175,55,0.15)",

            "@media (max-width: 480px)": {
              flexDirection: "column",
              alignItems: "stretch",
              gap: 1.5,
            },
          }}
        >
          {/* RANGE SELECT */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,

              "@media (max-width: 480px)": {
                width: "100%",
                justifyContent: "space-between",
              },
            }}
          >
            <span className="text-omega-gold text-sm font-semibold opacity-90">
              Range
            </span>

            <Select
              value={range}
              onChange={(e: SelectChangeEvent) =>
                setRange(e.target.value as "hour" | "day" | "week")
              }
              sx={{
                height: 36,
                minWidth: 110,
                background: "rgba(0,0,0,0.2)",
                borderRadius: "0.6rem",
                color: "var(--omega-gold)",
                border: "1px solid var(--omega-dark-gold)",
                "& .MuiSelect-select": { paddingY: "6px" },
                flexShrink: 1,
              }}
              MenuProps={menuProps}
            >
              <MenuItem value="hour">Hourly</MenuItem>
              <MenuItem value="day">Daily</MenuItem>
              <MenuItem value="week">Weekly</MenuItem>
            </Select>
          </Box>

          {/* MARKET FILTER */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,

              "@media (max-width: 480px)": {
                width: "100%",
                flexDirection: "column",
                alignItems: "stretch",
                gap: 1,
              },
            }}
          >
            <span className="text-omega-gold text-sm font-semibold opacity-90">
              Market
            </span>

            <Box
              sx={{
                display: "flex",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              {[
                { key: "all", label: "ALL" },
                { key: "forex", label: "FX" },
                { key: "crypto", label: "CRYPTO" },
                { key: "stock", label: "STOCKS" },
              ].map((m) => (
                <Button
                  key={m.key}
                  onClick={() => setMarketFilter(m.key)}
                  sx={{
                    px: 2,
                    py: 0.4,
                    borderRadius: "0.6rem",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color:
                      marketFilter === m.key
                        ? "var(--omega-green)"
                        : "var(--omega-gold)",
                    backgroundColor:
                      marketFilter === m.key
                        ? "var(--omega-gold)"
                        : "rgba(0,0,0,0.25)",
                    border: "1px solid var(--omega-dark-gold)",
                    "&:hover": {
                      backgroundColor:
                        marketFilter === m.key
                          ? "var(--omega-gold)"
                          : "rgba(212,175,55,0.15)",
                    },
                    whiteSpace: "nowrap",
                  }}
                >
                  {m.label}
                </Button>
              ))}
            </Box>
          </Box>

          {/* SYMBOL SELECT */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,

              "@media (max-width: 480px)": {
                width: "100%",
                justifyContent: "space-between",
              },
            }}
          >
            <span className="text-omega-gold text-sm font-semibold opacity-90">
              Symbol
            </span>

            <Select
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              sx={{
                height: 36,
                minWidth: 120,
                background: "rgba(0,0,0,0.2)",
                borderRadius: "0.6rem",
                color: "var(--omega-gold)",
                border: "1px solid var(--omega-dark-gold)",
                "& .MuiSelect-select": { paddingY: "6px" },
                flexShrink: 1,
              }}
              MenuProps={menuProps}
            >
              <MenuItem value="all">All Symbols</MenuItem>
              {symbolList.map((sym) => (
                <MenuItem key={sym} value={sym}>
                  {sym}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </Box>

        {/* EQUITY CHART */}
        <ChartWrapper height={300}>
          <PerformanceChart data={equityData} />
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

        {/* ANALYTICS CARDS */}
        <StrategyMiniCards signals={allSignals} />
        <StrategyLeaderboard signals={allSignals} />
        <SymbolLeaderboard signals={allSignals} />

        <HalaalTracker signals={allSignals} />

        {/* MARKET BREAKDOWN */}
        <ChartWrapper height={300}>
          <MarketBreakdown signals={allSignals} />
        </ChartWrapper>

        {/* RECENT SIGNALS */}
        <RecentSignals signals={recentSignals} />

        {/* NAV BUTTONS */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row justify-center gap-3 mt-6"
        >
          <Link href="/signals/active" className="flex-1">
            <Button
              fullWidth
              sx={{
                backgroundColor: "var(--omega-gold)",
                color: "var(--omega-green)",
                fontWeight: 700,
                borderRadius: "0.75rem",
                py: 1.5,
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                "&:hover": { backgroundColor: "rgba(212,175,55,0.85)" },
              }}
            >
              <span className="text-lg">
                <FiActivity />
              </span>
              ACTIVE SIGNALS
            </Button>
          </Link>

          <Link href="/signals/all" className="flex-1">
            <Button
              fullWidth
              sx={{
                backgroundColor: "var(--omega-gold)",
                color: "var(--omega-green)",
                fontWeight: 700,
                borderRadius: "0.75rem",
                py: 1.5,
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                "&:hover": { backgroundColor: "rgba(212,175,55,0.85)" },
              }}
            >
              <span className="text-lg">
                <FiFolder />
              </span>
              ALL SIGNALS
            </Button>
          </Link>

          <Link href="/signals/new" className="flex-1">
            <Button
              fullWidth
              sx={{
                backgroundColor: "var(--omega-gold)",
                color: "var(--omega-green)",
                fontWeight: 700,
                borderRadius: "0.75rem",
                py: 1.5,
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                "&:hover": { backgroundColor: "rgba(212,175,55,0.85)" },
              }}
            >
              <span className="text-lg">
                <FiPlusCircle />
              </span>
              ADD NEW SIGNAL
            </Button>
          </Link>
        </motion.div>
      </motion.main>
    </>
  );
}
