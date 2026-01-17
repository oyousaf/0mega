import { pool } from "@/lib/neon";

/* -------------------------------------------------
   MODE FLAGS
-------------------------------------------------- */
const RISK_ENABLED = true;

/* -------------------------------------------------
   CONTROLS 
-------------------------------------------------- */
const COOLDOWN_MINUTES = 10;
const MAX_TRADES_PER_DAY = 25;
const MAX_CONSECUTIVE_LOSSES = 3;

const MAX_DAILY_LOSS_PCT = 0.03;
const ASSUMED_EQUITY = 100_000;

type RiskResult = { allowed: true } | { allowed: false; reason: string };

function minutes(n: number) {
  return n * 60 * 1000;
}

export async function riskGate(
  signal: any,
  price: number
): Promise<RiskResult> {
  try {
    if (!RISK_ENABLED) return { allowed: true };

    // Must have SL
    if (!signal?.sl || !Number.isFinite(Number(signal.sl))) {
      return { allowed: false, reason: "NO_STOP_LOSS" };
    }

    // Optional: disable BUY side (if UP was your loser)
    // Toggle this ON if you want to run "DOWN-only" for one experiment.
    const DISABLE_BUY = false;
    if (DISABLE_BUY && signal.direction === "BUY") {
      return { allowed: false, reason: "BUY_DISABLED" };
    }

    /* -----------------------------
       1) Cooldown after last close
    ------------------------------ */
    const { rows: lastClosed } = await pool.query(
      `
      SELECT closed_at
      FROM paper_trades
      WHERE is_closed = true AND closed_at IS NOT NULL
      ORDER BY closed_at DESC
      LIMIT 1
      `
    );

    if (lastClosed.length) {
      const t = new Date(lastClosed[0].closed_at).getTime();
      if (Number.isFinite(t) && Date.now() - t < minutes(COOLDOWN_MINUTES)) {
        return { allowed: false, reason: "COOLDOWN" };
      }
    }

    /* -----------------------------
       2) Max trades per day
    ------------------------------ */
    const { rows: todays } = await pool.query(
      `
      SELECT COUNT(*)::int AS c
      FROM paper_trades
      WHERE opened_at::date = CURRENT_DATE
      `
    );

    if (Number(todays?.[0]?.c ?? 0) >= MAX_TRADES_PER_DAY) {
      return { allowed: false, reason: "MAX_TRADES_PER_DAY" };
    }

    /* -----------------------------
   3) Max consecutive losses (DAILY RESET)
------------------------------ */
    const { rows: streak } = await pool.query(
      `SELECT realised_pl
      FROM paper_trades
      WHERE is_closed = true
      AND realised_pl IS NOT NULL
      AND closed_at::date = CURRENT_DATE
      ORDER BY closed_at DESC
      LIMIT $1
      `,
      [MAX_CONSECUTIVE_LOSSES]
    );

    if (
      streak.length === MAX_CONSECUTIVE_LOSSES &&
      streak.every((r) => Number(r.realised_pl) < 0)
    ) {
      return { allowed: false, reason: "MAX_CONSECUTIVE_LOSSES" };
    }

    if (
      streak.length === MAX_CONSECUTIVE_LOSSES &&
      streak.every((r) => Number(r.realised_pl) < 0)
    ) {
      return { allowed: false, reason: "MAX_CONSECUTIVE_LOSSES" };
    }

    /* -----------------------------
       4) Daily loss cap (realised)
    ------------------------------ */
    const { rows: pnl } = await pool.query(
      `
      SELECT COALESCE(SUM(realised_pl), 0) AS pnl
      FROM paper_trades
      WHERE is_closed = true
        AND closed_at::date = CURRENT_DATE
        AND realised_pl IS NOT NULL
      `
    );

    const dailyPnl = Number(pnl?.[0]?.pnl ?? 0);
    if (dailyPnl < -ASSUMED_EQUITY * MAX_DAILY_LOSS_PCT) {
      return { allowed: false, reason: "MAX_DAILY_LOSS" };
    }

    return { allowed: true };
  } catch (e: any) {
    return { allowed: false, reason: e?.message ?? "RISK_GATE_ERROR" };
  }
}
