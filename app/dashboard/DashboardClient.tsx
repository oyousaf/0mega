"use client";

import {
  Box,
  Button,
  Grid,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState, useMemo } from "react";

import { computeMetrics } from "@/lib/metrics";
import RecentSignals from "@/components/dashboard/RecentSignals";
import { Signal } from "@/app/types/signal";

// Client-only chart
const PerformanceChart = dynamic(
  () => import("@/components/charts/PerformanceChart"),
  { ssr: false }
);

/* -------------------------------------------------------
   Time Range Formatting
------------------------------------------------------- */
function formatDate(date: Date, range: "hour" | "day" | "week"): string {
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

/* -------------------------------------------------------
   Equity Curve
------------------------------------------------------- */
function buildEquityCurve(signals: Signal[]) {
  let eq = 0;
  return signals.map((s) => {
    const win = s.status.toLowerCase().includes("tp");
    eq += win ? 1 : -1;
    return eq;
  });
}

interface DashboardClientProps {
  initialSignals: Signal[];
  recentSignals: Signal[];
}

/* -------------------------------------------------------
   Dropdown styling (Omega style)
------------------------------------------------------- */
const selectStyle = {
  backgroundColor: "var(--omega-green)",
  border: "1px solid var(--omega-dark-gold)",
  borderRadius: "0.75rem",
  color: "var(--omega-gold)",
  fontWeight: 600,

  "& .MuiSelect-select": {
    color: "var(--omega-gold)",
  },

  "& .MuiSvgIcon-root": {
    color: "var(--omega-gold)",
  },

  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--omega-dark-gold)",
  },

  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--omega-gold)",
  },

  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--omega-gold)",
  },
};

const menuProps = {
  PaperProps: {
    sx: {
      backgroundColor: "var(--omega-green)",
      border: "1px solid var(--omega-dark-gold)",
      borderRadius: "0.75rem",
      color: "var(--omega-gold)",
      "& .MuiMenuItem-root": {
        color: "var(--omega-gold)",
        fontWeight: 600,
      },
      "& .MuiMenuItem-root.Mui-selected": {
        backgroundColor: "rgba(212,175,55,0.15)",
      },
      "& .MuiMenuItem-root:hover": {
        backgroundColor: "rgba(212,175,55,0.25)",
      },
    },
  },
};

/* -------------------------------------------------------
   MAIN
------------------------------------------------------- */
export default function DashboardClient({
  initialSignals,
  recentSignals,
}: DashboardClientProps) {
  const [allSignals, setAllSignals] = useState(initialSignals);

  // Filters
  const [range, setRange] = useState<"hour" | "day" | "week">("day");
  const [symbolFilter, setSymbolFilter] = useState("all");
  const [marketFilter, setMarketFilter] = useState("all");

  // Metrics
  const [metrics, setMetrics] = useState(() => computeMetrics(initialSignals));

  /* -------------------------------------------------------
     Auto-refresh
     Uses your normalise() pipeline on server.
  ------------------------------------------------------- */
  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await fetch("/api/dashboard-signals");
        const data = await res.json();

        if (Array.isArray(data.signals)) {
          setAllSignals(data.signals);
          setMetrics(computeMetrics(data.signals));
        }
      } catch {}
    };

    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, []);

  /* -------------------------------------------------------
     Chart Data
  ------------------------------------------------------- */
  const chartData = useMemo(() => {
    const grouped: Record<
      string,
      { wins: number; total: number; trades: Signal[] }
    > = {};

    const filtered = allSignals.filter((s) => {
      if (symbolFilter !== "all" && s.symbol !== symbolFilter) return false;
      if (marketFilter !== "all" && s.type !== marketFilter) return false;
      return true;
    });

    filtered.forEach((s) => {
      const key = formatDate(new Date(s.created_at), range);

      if (!grouped[key]) grouped[key] = { wins: 0, total: 0, trades: [] };

      grouped[key].total++;
      grouped[key].trades.push(s);

      if (s.status.toLowerCase().includes("tp")) grouped[key].wins++;
    });

    const equityCurve = buildEquityCurve(filtered);

    return Object.entries(grouped).map(([date, info], i) => ({
      date,
      winRate: Math.round((info.wins / info.total) * 100),
      totalTrades: info.total,
      equity: equityCurve[i] ?? 0,
    }));
  }, [allSignals, range, symbolFilter, marketFilter]);

  /* -------------------------------------------------------
     Unique Symbols
  ------------------------------------------------------- */
  const symbolList = Array.from(
    new Set(allSignals.map((s) => s.symbol))
  ).sort();

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto text-center p-6 space-y-8"
    >
      <motion.h1
        className="text-3xl font-semibold text-omega-gold"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        𝛀mega Dashboard
      </motion.h1>

      {/* Filters */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
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

        <Grid size={{ xs: 12, sm: 4 }}>
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

        <Grid size={{ xs: 12, sm: 4 }}>
          <Select
            fullWidth
            value={marketFilter}
            onChange={(e) => setMarketFilter(e.target.value)}
            sx={selectStyle}
            MenuProps={menuProps}
          >
            <MenuItem value="all">All Markets</MenuItem>
            <MenuItem value="forex">FOREX</MenuItem>
            <MenuItem value="crypto">CRYPTO</MenuItem>
            <MenuItem value="stock">STOCKS</MenuItem>
          </Select>
        </Grid>
      </Grid>

      {/* Chart */}
      <AnimatePresence mode="wait">
        <motion.div
          key={JSON.stringify(chartData)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
        >
          <PerformanceChart data={chartData} />
        </motion.div>
      </AnimatePresence>

      {/* Recent Signals */}
      <RecentSignals signals={recentSignals} />

      {/* ---------------- Nav Buttons ---------------- */}
      <Box className="flex justify-center gap-4 mt-4">
        {/* View Active Signals */}
        <Link href="/signals">
          <Button
            variant="contained"
            sx={{
              backgroundColor: "var(--omega-gold)",
              color: "var(--omega-green)",
              fontWeight: 600,
            }}
          >
            📡 View Active Signals
          </Button>
        </Link>

        {/* View ALL Signals */}
        <Link href="/signals/all">
          <Button
            variant="contained"
            sx={{
              backgroundColor: "var(--omega-gold)",
              color: "var(--omega-green)",
              fontWeight: 600,
            }}
          >
            📁 View All Signals
          </Button>
        </Link>

        {/* Add Signal */}
        <Link href="/signals/new">
          <Button
            variant="contained"
            sx={{
              backgroundColor: "var(--omega-gold)",
              color: "var(--omega-green)",
              fontWeight: 600,
            }}
          >
            ➕ Add Signal
          </Button>
        </Link>
      </Box>
    </motion.main>
  );
}
