import { pool } from "@/lib/neon";
import { calculatePositionSize } from "./positionSizing";

/* -------------------------------------------------
   Sprint Mode Flags
-------------------------------------------------- */

const SPRINT_18_BYPASS = true;

/* -------------------------------------------------
   Risk Limits
-------------------------------------------------- */

const MAX_RISK_PER_TRADE = 0.01;
const MAX_DAILY_RISK = 0.03;

type RiskResult = { allowed: true } | { allowed: false; reason: string };

export async function riskGate(
  signal: any,
  price: number
): Promise<RiskResult> {
  if (SPRINT_18_BYPASS) {
    return { allowed: true };
  }

  if (!signal.sl) {
    return { allowed: false, reason: "NO_STOP_LOSS" };
  }

  const { rows } = await pool.query(
    `SELECT balance FROM paper_account LIMIT 1`
  );

  if (!rows.length) {
    return { allowed: false, reason: "NO_ACCOUNT_BALANCE" };
  }

  const equity = Number(rows[0].balance);

  const approvedQty = calculatePositionSize({
    equity,
    entry: price,
    stopLoss: Number(signal.sl),
    riskPct: MAX_RISK_PER_TRADE,
  });

  if (approvedQty <= 0) {
    return { allowed: false, reason: "POSITION_SIZE_ZERO" };
  }

  if (signal.qty && approvedQty < Number(signal.qty)) {
    return { allowed: false, reason: "POSITION_TOO_LARGE" };
  }

  const tradeRisk =
    signal.sl && signal.qty
      ? Math.abs(price - Number(signal.sl)) * Number(signal.qty)
      : 0;

  const { rows: used } = await pool.query(
    `
    SELECT COALESCE(SUM(risk_amount), 0) AS total
    FROM trade_executions
    WHERE timestamp::date = CURRENT_DATE
      AND status = 'SUCCESS'
    `
  );

  if (Number(used[0].total) + tradeRisk > equity * MAX_DAILY_RISK) {
    return { allowed: false, reason: "MAX_DAILY_RISK_EXCEEDED" };
  }

  return { allowed: true };
}
