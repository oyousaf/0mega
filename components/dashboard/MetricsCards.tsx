"use client";

import { Card, CardContent, Typography, Grid } from "@mui/material";
import { motion } from "framer-motion";
import { DashboardMetrics } from "@/lib/metrics";

interface Props {
  metrics: DashboardMetrics;
}

const cardStyle = {
  backgroundColor: "var(--omega-green)",
  border: "1px solid var(--omega-dark-gold)",
  borderRadius: "0.75rem",
  color: "var(--omega-gold)",
  padding: "1rem",
  textAlign: "center",
};

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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card sx={cardStyle}>
        <CardContent>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            {title}
          </Typography>
          <Typography variant="h5" fontWeight={"bold"}>
            {value}
            {suffix}
          </Typography>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function MetricsCards({ metrics }: Props) {
  return (
    <Grid
      container
      spacing={3}
      justifyContent="center"
      alignItems="center"
      className="text-center"
    >
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
        <MetricBox title="Halaal Ratio" value={metrics.halaalRatio} suffix="%" />
      </Grid>
    </Grid>
  );
}
