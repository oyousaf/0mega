"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useDashboard, DashboardPayload } from "@/hooks/useDashboard";

import DashboardHeader from "./DashboardHeader";
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
import EventRiskWidget from "@/components/dashboard/EventRiskWidget";
import GlobalLoading from "@/app/loading";

const PerformanceChart = dynamic(
  () => import("@/components/charts/PerformanceChart"),
  { ssr: false },
);

const DrawdownChart = dynamic(
  () => import("@/components/charts/DrawdownChart"),
  { ssr: false },
);

export default function DashboardClient() {
  const dashboard = useDashboard(15000) as DashboardPayload | null;

  if (!dashboard) return <GlobalLoading />;

  const equity = dashboard?.equityCurve ?? [];
  const trades = dashboard?.tradeHistory ?? [];

  const lastUpdated = dashboard?.engine?.lastTick
    ? new Date(dashboard.engine.lastTick).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <>
      <DashboardHeader />

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="px-2 sm:px-4 pb-[env(safe-area-inset-bottom)] space-y-4 sm:space-y-6"
      >
        <TodayStatusWidget />

        <EventRiskWidget />

        <MetricsCards />

        <ForwardTestReview trades={trades} />

        <OpenTradesWidget />

        <ChartWrapper height={300}>
          <PerformanceChart
            data={equity.map((e) => ({
              date: e.closed_at,
              cumulative: e.equity,
            }))}
          />
        </ChartWrapper>

        <ChartWrapper height={220}>
          <DrawdownChart
            data={equity.map((e) => ({
              date: e.closed_at,
              drawdown: e.drawdown ?? 0,
            }))}
          />
        </ChartWrapper>

        <div className="flex justify-center">
          <div className="px-4 py-1 rounded-lg text-xs font-bold tracking-widest border border-omega-dark-gold text-omega-gold bg-black/25">
            LAST UPDATED: {lastUpdated}
          </div>
        </div>

        <StrategyMiniCards trades={trades} />

        <StrategyLeaderboard trades={trades} />

        <SymbolLeaderboard trades={trades} />

        <MarketBreakdown trades={trades} />

        <HalaalTracker trades={trades} />

        <TradeHistoryWidget />
      </motion.main>
    </>
  );
}
