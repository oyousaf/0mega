import { pool } from "@/lib/neon";

const RISK_ENABLED = true;

const COOLDOWN_MINUTES = 10;
const MAX_TRADES_PER_DAY = 25;
const MAX_CONSECUTIVE_LOSSES = 3;

const MAX_DAILY_LOSS_PCT = 0.03;
const ACCOUNT_EQUITY = 10000;

type RiskResult = { allowed: true } | { allowed: false; reason: string };

function minutes(n: number) {
  return n * 60 * 1000;
}

export async function riskGate(signal: any): Promise<RiskResult> {
  try {
    if (!RISK_ENABLED) return { allowed: true };

    if (!signal?.sl || !Number.isFinite(Number(signal.sl))) {
      return { allowed: false, reason: "NO_STOP_LOSS" };
    }

    const sl = Number(signal.sl);
    if (sl <= 0) {
      return { allowed: false, reason: "INVALID_SL" };
    }

    /* cooldown */

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
      const t = new Date(lastClosed[0].closed_at).getTime();
      if (Number.isFinite(t) && Date.now() - t < minutes(COOLDOWN_MINUTES)) {
        return { allowed: false, reason: "COOLDOWN" };
      }
    }

    /* daily trades */

    const { rows: todays } = await pool.query(
      `
      SELECT COUNT(*)::int AS c
      FROM paper_trades
      WHERE opened_at::date = CURRENT_DATE
      `,
    );

    if (Number(todays?.[0]?.c ?? 0) >= MAX_TRADES_PER_DAY) {
      return { allowed: false, reason: "MAX_TRADES_PER_DAY" };
    }

    /* loss streak */

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
      streak.every((r) => Number(r.realised_pl) < 0)
    ) {
      return { allowed: false, reason: "MAX_CONSECUTIVE_LOSSES" };
    }

    /* daily loss */

    const { rows: pnl } = await pool.query(
      `
      SELECT COALESCE(SUM(realised_pl),0) AS pnl
      FROM paper_trades
      WHERE is_closed = true
      AND closed_at::date = CURRENT_DATE
      `,
    );

    const dailyPnl = Number(pnl?.[0]?.pnl ?? 0);

    if (dailyPnl < -ACCOUNT_EQUITY * MAX_DAILY_LOSS_PCT) {
      return { allowed: false, reason: "MAX_DAILY_LOSS" };
    }

    return { allowed: true };
  } catch (e: any) {
    return { allowed: false, reason: e?.message ?? "RISK_GATE_ERROR" };
  }
}
