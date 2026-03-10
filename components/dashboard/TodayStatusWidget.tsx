"use client";

import { motion } from "framer-motion";
import { fmtPnL } from "@/lib/format";
import { useDashboard, DashboardPayload } from "@/hooks/useDashboard";

export default function TodayStatusWidget() {
  const data = useDashboard(15000) as DashboardPayload | null;

  const engine = data?.engine;

  const pnlRaw = Number(engine?.pnlToday ?? 0);
  const pnlToday = Math.abs(pnlRaw) < 0.005 ? 0 : pnlRaw;

  const tradesToday = Number(engine?.tradesToday ?? 0);
  const openTrades = Number(engine?.openTrades ?? 0);
  const lossUsedPct = Number(engine?.lossUsedPct ?? 0);
  const tradingAllowed = Boolean(engine?.tradingAllowed);
  const lastTick = engine?.lastTick ?? "";

  const pnlColor =
    pnlToday > 0
      ? "text-green-400"
      : pnlToday < 0
        ? "text-red-400"
        : "text-neutral-300";

  const statusColor = tradingAllowed ? "text-green-400" : "text-red-500";

  const lossColor =
    lossUsedPct >= 80
      ? "text-red-400"
      : lossUsedPct >= 50
        ? "text-yellow-300"
        : "text-omega-gold";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-6xl mx-auto rounded-xl p-4 bg-omega-green border border-omega-dark-gold shadow-[0_0_18px_rgba(212,175,55,0.15)]"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-center">
        <Block label="TODAY PNL">
          <span className={`text-xl font-bold ${pnlColor}`}>
            {fmtPnL(pnlToday)}
          </span>
        </Block>

        <Block label="TRADES TODAY" value={tradesToday} />

        <Block label="OPEN TRADES" value={openTrades} />

        <Block label="LOSS USED">
          <span className={`text-lg font-bold ${lossColor}`}>
            {lossUsedPct.toFixed(1)}%
          </span>
        </Block>

        <Block label="STATUS">
          <span className={`text-lg font-bold ${statusColor}`}>
            {tradingAllowed ? "TRADING" : "FROZEN"}
          </span>
        </Block>

        <Block label="LAST TICK">
          <span className="text-xs opacity-70 tracking-wide">
            {lastTick ? new Date(lastTick).toLocaleTimeString("en-GB") : "—"}
          </span>
        </Block>
      </div>
    </motion.div>
  );
}

function Block({
  label,
  value,
  children,
}: {
  label: string;
  value?: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.65rem] tracking-widest opacity-60 text-omega-gold">
        {label}
      </span>

      {children ? (
        children
      ) : (
        <span className="text-lg font-semibold text-omega-gold">
          {value ?? 0}
        </span>
      )}
    </div>
  );
}
