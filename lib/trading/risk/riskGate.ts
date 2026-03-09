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

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function minutes(n: number): number {
  return n * 60 * 1000;
}

/* -------------------------------------------------
RISK GATE
-------------------------------------------------- */

export async function riskGate(signal: Signal): Promise<RiskResult> {
  try {
    if (!RISK_ENABLED) {
      return { allowed: true };
    }

    /* -----------------------------------------
       STOP LOSS VALIDATION
    ------------------------------------------ */

    const sl = safeNum(signal?.sl);

    if (!(sl > 0)) {
      return { allowed: false, reason: "INVALID_SL" };
    }

    /* -----------------------------------------
       FETCH RISK DATA (single query)
    ------------------------------------------ */

    const { rows } = await pool.query(
      `
      SELECT
        MAX(closed_at) AS last_closed,

        COUNT(*) FILTER (
          WHERE opened_at::date = CURRENT_DATE
        ) AS trades_today,

        COALESCE(
          SUM(realised_pl) FILTER (
            WHERE is_closed = true
            AND closed_at::date = CURRENT_DATE
          ),
          0
        ) AS pnl_today,

        ARRAY(
          SELECT realised_pl
          FROM paper_trades
          WHERE is_closed = true
          AND closed_at::date = CURRENT_DATE
          ORDER BY closed_at DESC
          LIMIT $1
        ) AS last_results

      FROM paper_trades
      `,
      [MAX_CONSECUTIVE_LOSSES],
    );

    const r = rows[0] ?? {};

    const lastClosed = r.last_closed ? new Date(r.last_closed).getTime() : null;

    const tradesToday = safeNum(r.trades_today);
    const dailyPnl = safeNum(r.pnl_today);

    const lastResults: number[] = Array.isArray(r.last_results)
      ? r.last_results.map(safeNum)
      : [];

    /* -----------------------------------------
       COOLDOWN
    ------------------------------------------ */

    if (
      lastClosed &&
      Number.isFinite(lastClosed) &&
      Date.now() - lastClosed < minutes(COOLDOWN_MINUTES)
    ) {
      return { allowed: false, reason: "COOLDOWN" };
    }

    /* -----------------------------------------
       DAILY TRADE LIMIT
    ------------------------------------------ */

    if (tradesToday >= MAX_TRADES_PER_DAY) {
      return { allowed: false, reason: "MAX_TRADES_PER_DAY" };
    }

    /* -----------------------------------------
       CONSECUTIVE LOSSES
    ------------------------------------------ */

    if (
      lastResults.length === MAX_CONSECUTIVE_LOSSES &&
      lastResults.every((pl) => pl < 0)
    ) {
      return { allowed: false, reason: "MAX_CONSECUTIVE_LOSSES" };
    }

    /* -----------------------------------------
       DAILY LOSS LIMIT
    ------------------------------------------ */

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
