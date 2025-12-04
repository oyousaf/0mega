"use client";

import {
  Box,
  Button,
  Grid,
  MenuItem,
  Select,
  SelectChangeEvent,
  Modal,
} from "@mui/material";

import { motion } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState, useMemo } from "react";
import { FiSettings } from "react-icons/fi";

import { computeMetrics } from "@/lib/metrics";
import RecentSignals from "@/components/dashboard/RecentSignals";
import { Signal } from "@/app/types/signal";
import NotificationsPanel from "@/components/settings/NotificationsPanel";

import MetricsCards from "@/components/dashboard/MetricsCards";
import SymbolLeaderboard from "@/components/dashboard/SymbolLeaderboard";

const PerformanceChart = dynamic(
  () => import("@/components/charts/PerformanceChart"),
  { ssr: false }
);

function formatDate(date: Date, range: "hour" | "day" | "week") {
  if (range === "hour") return date.toISOString().slice(0, 13) + ":00";
  if (range === "day") return date.toISOString().split("T")[0];

  if (range === "week") {
    const d = new Date(date);
    const start = new Date(d.setDate(d.getDate() - d.getDay() + 1))
      .toISOString()
      .split("T")[0];
    return start;
  }
  return "unknown";
}

function buildEquityCurve(signals: Signal[]) {
  let eq = 0;
  return signals.map((s) => {
    const win = s.status.toLowerCase().includes("tp");
    eq += win ? 1 : -1;
    return eq;
  });
}

const selectStyle = {
  backgroundColor: "var(--omega-green)",
  border: "1px solid var(--omega-dark-gold)",
  borderRadius: "0.75rem",
  color: "var(--omega-gold)",
  fontWeight: 600,

  "& .MuiSelect-select": { color: "var(--omega-gold)" },
  "& .MuiSvgIcon-root": { color: "var(--omega-gold)" },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "var(--omega-dark-gold)" },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "var(--omega-gold)" },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "var(--omega-gold)" },
};

const menuProps = {
  PaperProps: {
    sx: {
      backgroundColor: "var(--omega-green)",
      border: "1px solid var(--omega-dark-gold)",
      borderRadius: "0.75rem",
      color: "var(--omega-gold)",
      "& .MuiMenuItem-root": { color: "var(--omega-gold)", fontWeight: 600 },
      "& .MuiMenuItem-root.Mui-selected": { backgroundColor: "rgba(212,175,55,0.15)" },
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

  const chartData = useMemo(() => {
    const grouped: Record<string, { wins: number; total: number }> = {};

    const filtered = allSignals.filter((s) => {
      if (symbolFilter !== "all" && s.symbol !== symbolFilter) return false;
      if (marketFilter !== "all" && s.type !== marketFilter) return false;
      return true;
    });

    filtered.forEach((s) => {
      const key = formatDate(new Date(s.created_at), range);
      if (!grouped[key]) grouped[key] = { wins: 0, total: 0 };
      grouped[key].total++;
      if (s.status.toLowerCase().includes("tp")) grouped[key].wins++;
    });

    const equity = buildEquityCurve(filtered);

    return Object.entries(grouped).map(([date, info], i) => ({
      date,
      winRate: Math.round((info.wins / info.total) * 100),
      totalTrades: info.total,
      equity: equity[i] ?? 0,
    }));
  }, [allSignals, range, symbolFilter, marketFilter]);

  const symbolList = Array.from(new Set(allSignals.map((s) => s.symbol))).sort();

  return (
    <>
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
                fontWeight: 600,
              }}
            >
              Close
            </Button>
          </div>
        </motion.div>
      </Modal>

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
          𝛀mega Dashboard
        </motion.h1>

        <Box className="flex justify-end items-center gap-3 mt-2 pr-2">
          <Link href="/signals/active">
            <Button sx={{ backgroundColor: "var(--omega-gold)", color: "var(--omega-green)" }}>
              📡 Active
            </Button>
          </Link>

          <Link href="/signals/all">
            <Button sx={{ backgroundColor: "var(--omega-gold)", color: "var(--omega-green)" }}>
              📁 All
            </Button>
          </Link>

          <Link href="/signals/new">
            <Button sx={{ backgroundColor: "var(--omega-gold)", color: "var(--omega-green)" }}>
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

        <MetricsCards metrics={metrics} />

        {/* Gold market toggles (this replaces market dropdown entirely) */}
        <Box className="flex justify-center gap-4 mt-4">
          {["all", "forex", "crypto", "stock"].map((m) => (
            <Button
              key={m}
              onClick={() => setMarketFilter(m)}
              sx={{
                backgroundColor:
                  marketFilter === m ? "var(--omega-gold)" : "transparent",
                color:
                  marketFilter === m ? "var(--omega-green)" : "var(--omega-gold)",
                border: "1px solid var(--omega-gold)",
                fontWeight: 600,
                px: 3,
                textTransform: "uppercase",
              }}
            >
              {m}
            </Button>
          ))}
        </Box>

        {/* Filters */}
        <Grid container spacing={3} sx={{ mb: 3, mt: 1 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Select
              fullWidth
              value={range}
              onChange={(e: SelectChangeEvent) =>
                setRange(e.target.value as "hour" | "day" | "week")
              }
              sx={selectStyle}
              MenuProps={menuProps}
            >
              <MenuItem value="hour">Hourly</MenuItem>
              <MenuItem value="day">Daily</MenuItem>
              <MenuItem value="week">Weekly</MenuItem>
            </Select>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Select
              fullWidth
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              sx={selectStyle}
              MenuProps={menuProps}
            >
              <MenuItem value="all">All Symbols</MenuItem>
              {symbolList.map((sym) => (
                <MenuItem key={sym} value={sym}>
                  {sym}
                </MenuItem>
              ))}
            </Select>
          </Grid>
        </Grid>

        {lastUpdated && (
          <p className="text-omega-gold opacity-70 text-sm">
            Last updated at {lastUpdated}
          </p>
        )}

        <PerformanceChart data={chartData} />
        <SymbolLeaderboard metrics={metrics} />
        <RecentSignals signals={recentSignals} />
      </motion.main>
    </>
  );
}
