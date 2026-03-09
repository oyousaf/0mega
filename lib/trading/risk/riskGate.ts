import { pool } from "@/lib/neon";

/* -------------------------------------------------
CONFIG
-------------------------------------------------- */

const RISK_ENABLED = true;

const COOLDOWN_MINUTES = 10;

const MAX_TRADES_PER_DAY = 25;
const MAX_CONSECUTIVE_LOSSES = 3;

const MAX_DAILY_LOSS_PCT = 0.03;
const ACCOUNT_EQUITY = 10000;

/* -------------------------------------------------
TYPES
-------------------------------------------------- */

type RiskResult = { allowed: true } | { allowed: false; reason: string };

type Signal = {
  sl: number;
};

/* -------------------------------------------------
UTILS
-------------------------------------------------- */

function minutes(n: number) {
  return n * 60 * 1000;
}

function safeNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/* -------------------------------------------------
RISK GATE
-------------------------------------------------- */

export async function riskGate(signal: Signal): Promise<RiskResult> {
  try {
    if (!RISK_ENABLED) return { allowed: true };

    /* -----------------------------------------
       STOP LOSS VALIDATION
    ------------------------------------------ */

    const sl = safeNum(signal?.sl);

    if (!(sl > 0)) {
      return { allowed: false, reason: "INVALID_SL" };
    }

    /* -----------------------------------------
       COOLDOWN
    ------------------------------------------ */

    const { rows: lastClosed } = await pool.query(
      `
      SELECT closed_at
      FROM paper_trades
      WHERE is_closed = true
      ORDER BY closed_at DESC
      LIMIT 1
      `,
    );

    if (lastClosed.length) {
      const lastTime = new Date(lastClosed[0].closed_at).getTime();

      if (
        Number.isFinite(lastTime) &&
        Date.now() - lastTime < minutes(COOLDOWN_MINUTES)
      ) {
        return { allowed: false, reason: "COOLDOWN" };
      }
    }

    /* -----------------------------------------
       DAILY TRADE LIMIT
    ------------------------------------------ */

    const { rows: todays } = await pool.query(
      `
      SELECT COUNT(*)::int AS c
      FROM paper_trades
      WHERE opened_at::date = CURRENT_DATE
      `,
    );

    const tradesToday = safeNum(todays?.[0]?.c);

    if (tradesToday >= MAX_TRADES_PER_DAY) {
      return { allowed: false, reason: "MAX_TRADES_PER_DAY" };
    }

    /* -----------------------------------------
       CONSECUTIVE LOSSES
    ------------------------------------------ */

    const { rows: streak } = await pool.query(
      `
      SELECT realised_pl
      FROM paper_trades
      WHERE is_closed = true
      AND closed_at::date = CURRENT_DATE
      ORDER BY closed_at DESC
      LIMIT $1
      `,
      [MAX_CONSECUTIVE_LOSSES],
    );

    if (
      streak.length === MAX_CONSECUTIVE_LOSSES &&
      streak.every((r) => safeNum(r.realised_pl) < 0)
    ) {
      return { allowed: false, reason: "MAX_CONSECUTIVE_LOSSES" };
    }

    /* -----------------------------------------
       DAILY LOSS LIMIT
    ------------------------------------------ */

    const { rows: pnl } = await pool.query(
      `
      SELECT COALESCE(SUM(realised_pl),0) AS pnl
      FROM paper_trades
      WHERE is_closed = true
      AND closed_at::date = CURRENT_DATE
      `,
    );

    const dailyPnl = safeNum(pnl?.[0]?.pnl);

    const maxDailyLoss = ACCOUNT_EQUITY * MAX_DAILY_LOSS_PCT;

    if (dailyPnl < -maxDailyLoss) {
      return { allowed: false, reason: "MAX_DAILY_LOSS" };
    }

    /* -----------------------------------------
       PASS
    ------------------------------------------ */

    return { allowed: true };
  } catch (err: any) {
    console.error("[RISK_GATE_ERROR]", err);

    return {
      allowed: false,
      reason: err?.message ?? "RISK_GATE_ERROR",
    };
  }
}
