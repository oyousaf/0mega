"use client";

import { Card, CardContent, Typography, Grid } from "@mui/material";
import { motion, easeOut, useInView } from "framer-motion";
import { useRef } from "react";
import { useDashboard, DashboardPayload } from "@/hooks/useDashboard";

/* Animations */

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1, ease: easeOut },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } },
};

/* Styling */

const cardStyle = {
  backgroundColor: "var(--omega-green)",
  border: "1px solid var(--omega-dark-gold)",
  borderRadius: "0.75rem",
  padding: "1rem",
  textAlign: "center",
};

function MetricBox({
  title,
  value,
  suffix,
}: {
  title: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card sx={cardStyle}>
        <CardContent>
          <Typography
            variant="body2"
            sx={{ opacity: 0.65, color: "var(--omega-gold)" }}
          >
            {title}
          </Typography>

          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{ color: "var(--omega-gold)" }}
          >
            {value}
            {suffix}
          </Typography>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function MetricsCards() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const data = useDashboard(15000) as DashboardPayload | null;

  const m = data?.metrics;

  const metrics = {
    winRate: m?.winRate ?? 0,
    expectancy: m?.expectancy ?? 0,
    profitFactor: m?.profitFactor ?? 0,
    halaalRatio: m?.halaalRatio ?? 100,
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "show" : "hidden"}
      variants={containerVariants}
      className="w-full"
    >
      <Grid container spacing={3} justifyContent="center" alignItems="center">
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricBox title="Win Rate" value={metrics.winRate} suffix="%" />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricBox title="Expectancy (R)" value={metrics.expectancy} />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricBox title="Profit Factor" value={metrics.profitFactor} />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricBox
            title="Halaal Ratio"
            value={metrics.halaalRatio}
            suffix="%"
          />
        </Grid>
      </Grid>
    </motion.div>
  );
}
