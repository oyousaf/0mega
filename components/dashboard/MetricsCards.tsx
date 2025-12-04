"use client";

import { Card, CardContent, Typography, Grid } from "@mui/material";
import { motion, easeOut, useInView } from "framer-motion";
import { useRef } from "react";
import { DashboardMetrics } from "@/lib/metrics";

/* -------------------------------------------------------
   MOTION VARIANTS
------------------------------------------------------- */
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
      ease: easeOut,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: easeOut,
    },
  },
};

/* -------------------------------------------------------
   STYLE
------------------------------------------------------- */
const cardStyle = {
  backgroundColor: "var(--omega-green)",
  border: "1px solid var(--omega-dark-gold)",
  borderRadius: "0.75rem",
  color: "var(--omega-gold)",
  padding: "1rem",
  textAlign: "center",
};

interface Props {
  metrics: DashboardMetrics;
}

function MetricBox({
  title,
  value,
  suffix,
}: {
  title: string;
  value: number | string;
  suffix?: string;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card sx={cardStyle}>
        <CardContent>
          <Typography variant="body2" sx={{ opacity: 0.65 }}>
            {title}
          </Typography>

          <Typography variant="h5" fontWeight="bold">
            {value}
            {suffix}
          </Typography>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* -------------------------------------------------------
   MAIN
------------------------------------------------------- */
export default function MetricsCards({ metrics }: Props) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "show" : "hidden"}
      variants={containerVariants}
      className="w-full"
    >
      <Grid container spacing={3} justifyContent="center" alignItems="center">
        <Grid>
          <MetricBox title="Win Rate" value={metrics.winRate} suffix="%" />
        </Grid>

        <Grid>
          <MetricBox title="Expectancy (R)" value={metrics.expectancy} />
        </Grid>

        <Grid>
          <MetricBox title="Profit Factor" value={metrics.profitFactor} />
        </Grid>

        <Grid>
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
