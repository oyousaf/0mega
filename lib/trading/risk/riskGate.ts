import { pool } from "@/lib/db";
import { RISK_CONFIG } from "@/lib/trading/config/riskConfig";

/* -------------------------------------------------
CONFIG
-------------------------------------------------- */

const RISK_ENABLED = true;

const COOLDOWN_MINUTES = RISK_CONFIG.cooldownMinutes;

const MAX_TRADES_PER_DAY = RISK_CONFIG.maxTradesPerDay;
const MAX_CONSECUTIVE_LOSSES = RISK_CONFIG.maxConsecutiveLosses;

const MAX_DAILY_LOSS_PCT = RISK_CONFIG.maxDailyLossPct;
const ACCOUNT_EQUITY = RISK_CONFIG.initialEquity;

/* -------------------------------------------------
TYPES
-------------------------------------------------- */

type RiskResult =
  | { allowed: true }
  | { allowed: false; reason: string };

type Signal = {
  symbol: string;
  sl: number;
};

/* -------------------------------------------------
UTILS
-------------------------------------------------- */

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function minutes(n: number) {
  return n * 60 * 1000;
}

/* -------------------------------------------------
RISK GATE
-------------------------------------------------- */

export async function riskGate(
  signal: Signal,
): Promise<RiskResult> {
  try {
    if (!RISK_ENABLED) {
      return { allowed: true };
    }

    const sl = safeNum(signal.sl);

    if (!(sl > 0)) {
      return {
        allowed: false,
        reason: "INVALID_SL",
      };
    }

    const { rows } = await pool.query(
      `
      WITH

      /* -----------------------------------------
         PER-SYMBOL CLOSED TRADES
      ------------------------------------------ */

      symbol_closed AS (
        SELECT
          id,
          closed_at,
          realised_pl
        FROM paper_trades
        WHERE
          symbol = $2
          AND is_closed = true
          AND closed_at IS NOT NULL
          AND realised_pl IS NOT NULL
          AND (closed_at AT TIME ZONE 'UTC')::date =
              (NOW() AT TIME ZONE 'UTC')::date
      ),

      /* -----------------------------------------
         GLOBAL OPENED TODAY
      ------------------------------------------ */

      today_opened AS (
        SELECT id
        FROM paper_trades
        WHERE
          (opened_at AT TIME ZONE 'UTC')::date =
          (NOW() AT TIME ZONE 'UTC')::date
      ),

      /* -----------------------------------------
         GLOBAL CLOSED TODAY
      ------------------------------------------ */

      global_closed AS (
        SELECT realised_pl
        FROM paper_trades
        WHERE
          is_closed = true
          AND realised_pl IS NOT NULL
          AND closed_at IS NOT NULL
          AND (closed_at AT TIME ZONE 'UTC')::date =
              (NOW() AT TIME ZONE 'UTC')::date
      )

      SELECT

        (
          SELECT MAX(closed_at)
          FROM symbol_closed
        ) AS last_closed_symbol,

        (
          SELECT COUNT(*)
          FROM today_opened
        ) AS trades_today,

        (
          SELECT COALESCE(SUM(realised_pl),0)
          FROM global_closed
        ) AS pnl_today,

        ARRAY(
          SELECT realised_pl
          FROM symbol_closed
          ORDER BY closed_at DESC,id DESC
          LIMIT $1
        ) AS last_results_symbol
      `,
      [
        MAX_CONSECUTIVE_LOSSES,
        signal.symbol,
      ],
    );

    const r = rows[0] ?? {};

    const lastClosedSymbol = r.last_closed_symbol
      ? new Date(r.last_closed_symbol).getTime()
      : null;

    const tradesToday = safeNum(r.trades_today);

    const dailyPnl = safeNum(r.pnl_today);

    const lastResults: number[] =
      Array.isArray(r.last_results_symbol)
        ? r.last_results_symbol.map(safeNum)
        : [];

    /* -----------------------------------------
       SYMBOL COOLDOWN
    ------------------------------------------ */

    if (
      lastClosedSymbol &&
      Date.now() - lastClosedSymbol <
        minutes(COOLDOWN_MINUTES)
    ) {
      return {
        allowed: false,
        reason: "COOLDOWN",
      };
    }

    /* -----------------------------------------
       GLOBAL TRADE LIMIT
    ------------------------------------------ */

    if (tradesToday >= MAX_TRADES_PER_DAY) {
      return {
        allowed: false,
        reason: "MAX_TRADES_PER_DAY",
      };
    }

    /* -----------------------------------------
       SYMBOL LOSS STREAK
    ------------------------------------------ */

    if (
      lastResults.length ===
        MAX_CONSECUTIVE_LOSSES &&
      lastResults.every((x) => x < 0)
    ) {
      return {
        allowed: false,
        reason: "MAX_CONSECUTIVE_LOSSES",
      };
    }

    /* -----------------------------------------
       GLOBAL DAILY LOSS
    ------------------------------------------ */

    const maxDailyLoss =
      ACCOUNT_EQUITY *
      MAX_DAILY_LOSS_PCT;

    if (dailyPnl <= -maxDailyLoss) {
      return {
        allowed: false,
        reason: "MAX_DAILY_LOSS",
      };
    }

    return {
      allowed: true,
    };
  } catch (err: unknown) {
    console.error("[RISK_GATE_ERROR]", err);

    return {
      allowed: false,
      reason:
        (err instanceof Error ? err.message : null) ??
        "RISK_GATE_ERROR",
    };
  }
}
