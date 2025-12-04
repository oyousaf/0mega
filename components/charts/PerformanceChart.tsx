"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

import { Card, CardContent, Typography, Box } from "@mui/material";
import { motion } from "framer-motion";

interface ChartPoint {
  date: string;
  winRate: number;
  totalTrades: number;
  equity: number;
}

export default function PerformanceChart({ data }: { data: ChartPoint[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Box sx={{ width: "100%" }}>
        <Card
          sx={{
            backgroundColor: "var(--omega-green)",
            border: "1px solid var(--omega-dark-gold)",
            borderRadius: "1rem",
            padding: "1rem",
            color: "var(--omega-gold)",
            boxShadow:
              "0 0 20px rgba(212,175,55,0.15), inset 0 0 6px rgba(212,175,55,0.25)",
          }}
        >
          <CardContent>
            <Typography variant="h6" mb={2} fontWeight="bold">
              📈 Performance Chart
            </Typography>

            <Box sx={{ width: "100%" }}>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={data}>
                  <CartesianGrid
                    stroke="rgba(212,175,55,0.20)"
                    strokeDasharray="3"
                  />

                  <XAxis
                    dataKey="date"
                    stroke="var(--omega-gold)"
                    tick={{ fill: "var(--omega-gold)" }}
                  />

                  <YAxis
                    yAxisId="left"
                    stroke="var(--omega-gold)"
                    tick={{ fill: "var(--omega-gold)" }}
                  />

                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="var(--omega-gold)"
                    tick={{ fill: "var(--omega-gold)" }}
                  />

                  <Legend
                    wrapperStyle={{
                      color: "var(--omega-gold)",
                      marginTop: "10px",
                    }}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--omega-dark-gold)",
                      color: "var(--omega-green)",
                      border: "1px solid var(--omega-gold)",
                      borderRadius: "0.5rem",
                    }}
                  />

                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="winRate"
                    name="Win Rate %"
                    stroke="var(--omega-gold)"
                    strokeWidth={3}
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={900}
                  />

                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="totalTrades"
                    name="Total Trades"
                    stroke="var(--omega-dark-gold)"
                    strokeWidth={3}
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={900}
                  />

                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="equity"
                    name="Equity Curve"
                    stroke="#6CFFB5"
                    strokeWidth={3}
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={900}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </motion.div>
  );
}
