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
       FETCH RISK DATA
    ------------------------------------------ */

    const { rows } = await pool.query(
      `
      WITH today_closed AS (
        SELECT
          id,
          closed_at,
          realised_pl
        FROM paper_trades
        WHERE is_closed = true
          AND closed_at IS NOT NULL
          AND realised_pl IS NOT NULL
          AND (closed_at AT TIME ZONE 'UTC')::date =
              (NOW() AT TIME ZONE 'UTC')::date
      ),
      today_opened AS (
        SELECT id
        FROM paper_trades
        WHERE (opened_at AT TIME ZONE 'UTC')::date =
              (NOW() AT TIME ZONE 'UTC')::date
      )
      SELECT
        (
          SELECT MAX(closed_at)
          FROM today_closed
        ) AS last_closed_today,

        (
          SELECT COUNT(*)
          FROM today_opened
        ) AS trades_today,

        COALESCE(
          (
            SELECT SUM(realised_pl)
            FROM today_closed
          ),
          0
        ) AS pnl_today,

        ARRAY(
          SELECT realised_pl
          FROM today_closed
          ORDER BY closed_at DESC, id DESC
          LIMIT $1
        ) AS last_results_today
      `,
      [MAX_CONSECUTIVE_LOSSES],
    );

    const r = rows[0] ?? {};

    const lastClosedToday = r.last_closed_today
      ? new Date(r.last_closed_today).getTime()
      : null;

    const tradesToday = safeNum(r.trades_today);
    const dailyPnl = safeNum(r.pnl_today);

    const lastResultsToday: number[] = Array.isArray(r.last_results_today)
      ? r.last_results_today.map(safeNum)
      : [];

    /* -----------------------------------------
       COOLDOWN
       Applies only if there was a close today.
    ------------------------------------------ */

    if (
      lastClosedToday &&
      Number.isFinite(lastClosedToday) &&
      Date.now() - lastClosedToday < minutes(COOLDOWN_MINUTES)
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
       Day-scoped. Resets automatically at UTC midnight.
    ------------------------------------------ */

    if (
      lastResultsToday.length === MAX_CONSECUTIVE_LOSSES &&
      lastResultsToday.every((pl) => pl < 0)
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
