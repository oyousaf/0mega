import { pool } from "@/lib/neon";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Divider,
} from "@mui/material";

export default async function SignalDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  const { rows } = await pool.query(
    `SELECT * FROM signals WHERE id = $1 LIMIT 1`,
    [id]
  );

  const signal = rows[0];
  if (!signal) return notFound();

  const {
    symbol,
    strategy,
    entry_price,
    tp1,
    tp2,
    sl,
    status,
    type,
    halaal,
    created_at,
  } = signal;

  const statusLower = status.toLowerCase();
  const statusColor = statusLower.includes("tp")
    ? "#56AE57"
    : statusLower.includes("sl")
    ? "#C23B22"
    : "#789FCC";

  return (
    <main className="max-w-5xl mx-auto w-full p-6 space-y-6">
      {/* Back button */}
      <Link href="/signals">
        <Button
          variant="outlined"
          sx={{
            borderColor: "var(--omega-gold)",
            color: "var(--omega-gold)",
            "&:hover": {
              borderColor: "var(--omega-dark-gold)",
              backgroundColor: "rgba(212,175,55,0.15)",
            },
          }}
        >
          ← Back to Signals
        </Button>
      </Link>

      {/* Page header */}
      <Typography
        variant="h4"
        fontWeight="bold"
        sx={{ color: "var(--omega-gold)" }}
      >
        {symbol} — Signal Details
      </Typography>

      {/* Card */}
      <Card
        sx={{
          backgroundColor: "var(--omega-green)",
          border: "1px solid var(--omega-dark-gold)",
          color: "var(--omega-gold)",
          borderRadius: "1rem",
          boxShadow: "0 0 25px rgba(212,175,55,0.2)",
        }}
      >
        <CardContent className="space-y-6 p-6">
          {/* Top Row */}
          <Box className="flex justify-between items-center">
            <Typography variant="h5" fontWeight="bold">
              {symbol}
            </Typography>

            <Box className="flex items-center gap-2">
              {halaal && (
                <span className="text-xl font-bold text-omega-gold">☪</span>
              )}

              <Box
                sx={{
                  backgroundColor: statusColor,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: "6px",
                  fontWeight: 700,
                  color: "white",
                }}
              >
                {status.toUpperCase()}
              </Box>
            </Box>
          </Box>

          <Divider
            sx={{ borderColor: "var(--omega-dark-gold)", opacity: 0.4 }}
          />

          {/* Grid of details */}
          <Box className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Detail label="Symbol" value={symbol} />
            <Detail label="Type" value={type?.toUpperCase() ?? "N/A"} />
            <Detail label="Strategy" value={strategy || "N/A"} />
            <Detail label="Entry" value={entry_price} />
            <Detail label="TP1" value={tp1} />
            <Detail label="TP2" value={tp2} />
            <Detail label="Stop Loss" value={sl} />
            <Detail
              label="Created At"
              value={new Date(created_at).toLocaleString()}
            />
          </Box>

          <Divider
            sx={{ borderColor: "var(--omega-dark-gold)", opacity: 0.4 }}
          />

          {/* Action buttons */}
          <Box className="flex gap-4 pt-3">
            {/* Edit */}
            <Link href={`/signals/${id}/edit`}>
              <Button
                variant="contained"
                sx={{
                  backgroundColor: "var(--omega-gold)",
                  color: "var(--omega-green)",
                  fontWeight: 600,
                  "&:hover": { backgroundColor: "var(--omega-dark-gold)" },
                }}
              >
                Edit Signal
              </Button>
            </Link>

            {/* Delete */}
            <Link href={`/signals/${id}/delete`}>
              <Button
                variant="outlined"
                sx={{
                  borderColor: "#C23B22",
                  color: "#C23B22",
                  fontWeight: 600,
                  "&:hover": {
                    borderColor: "#a8321a",
                    backgroundColor: "rgba(194,59,34,0.1)",
                  },
                }}
              >
                Delete Signal
              </Button>
            </Link>
          </Box>
        </CardContent>
      </Card>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: any }) {
  return (
    <Box>
      <Typography
        variant="body2"
        sx={{ opacity: 0.7, marginBottom: "2px", color: "var(--foreground)" }}
      >
        {label}
      </Typography>
      <Typography
        variant="h6"
        fontWeight="bold"
        sx={{ color: "var(--omega-gold)" }}
      >
        {value}
      </Typography>
    </Box>
  );
}
