"use client";

import { Signal } from "@/app/types/signal";
import { omegaAnalytics as omega } from "./theme";
import { motion } from "framer-motion";
import { Box } from "@mui/material";

export default function HalaalTracker({ signals }: { signals: Signal[] }) {
  const total = signals.length;
  const halal = signals.filter((s) => s.halaal === true).length;
  const nonHalal = total - halal;

  const percent = total > 0 ? Math.round((halal / total) * 100) : 0;

  const badgeColor =
    percent >= 90 ? "#4CAF50" : percent >= 70 ? "#FFC107" : "#FF5252";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Box
        sx={{
          background: omega.cardBg,
          border: omega.cardBorder,
          boxShadow: omega.cardShadow,
          borderRadius: "1rem",
          padding: "1.2rem",
          marginTop: "2rem",
          color: omega.text,
        }}
      >
        <h2 className="text-xl font-semibold text-omega-gold mb-3">
          🕌 Halaal Compliance
        </h2>

        {/* METRICS ROW */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="opacity-70 text-sm">TOTAL</p>
            <p className="font-bold text-lg">{total}</p>
          </div>

          <div>
            <p className="opacity-70 text-sm">HALAAL</p>
            <p className="font-bold text-lg">{halal}</p>
          </div>

          <div>
            <p className="opacity-70 text-sm">NON-HALAAL</p>
            <p className="font-bold text-lg text-red-400">{nonHalal}</p>
          </div>
        </div>

        {/* BADGE */}
        <div className="flex justify-center mt-4">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
            style={{
              background: badgeColor,
              color: "#0d1f1a",
              fontWeight: 700,
              padding: "0.4rem 1rem",
              borderRadius: "0.6rem",
              boxShadow: "0 0 10px rgba(255,255,255,0.15)",
            }}
          >
            {percent}% HALAAL
          </motion.div>
        </div>
      </Box>
    </motion.div>
  );
}
