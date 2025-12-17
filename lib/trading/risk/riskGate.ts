import { pool } from "@/lib/neon";
import { calculatePositionSize } from "./positionSizing";

const MAX_RISK_PER_TRADE = 0.01; // 1%
const MAX_DAILY_RISK = 0.03; // 3%

type RiskResult =
  | { allowed: true; approvedQty: number }
  | { allowed: false; reason: string };

export async function riskGate(
  signal: any,
  price: number
): Promise<RiskResult> {
  if (!signal.sl) {
    return { allowed: false, reason: "NO_STOP_LOSS" };
  }

  /* -------------------------------------------------
     1) Load equity
  -------------------------------------------------- */
  const { rows: balanceRows } = await pool.query(
    `SELECT balance FROM paper_account LIMIT 1`
  );

  if (!balanceRows.length) {
    return { allowed: false, reason: "NO_ACCOUNT_BALANCE" };
  }

  const equity = Number(balanceRows[0].balance);

  /* -------------------------------------------------
     2) Position sizing
  -------------------------------------------------- */
  const approvedQty = calculatePositionSize({
    equity,
    entry: price,
    stopLoss: signal.sl,
    riskPct: MAX_RISK_PER_TRADE,
  });

  if (approvedQty <= 0) {
    return { allowed: false, reason: "POSITION_SIZE_ZERO" };
  }

  if (approvedQty < signal.qty) {
    return { allowed: false, reason: "POSITION_TOO_LARGE" };
  }

  const positionRisk = Math.abs(price - signal.sl) * signal.qty;

  /* -------------------------------------------------
     3) Daily risk cap
  -------------------------------------------------- */
  const { rows: today } = await pool.query(
    `
    SELECT COALESCE(SUM(risk_amount), 0) AS total
    FROM trade_executions
    WHERE created_at::date = CURRENT_DATE
      AND status = 'SUCCESS'
    `
  );

  const usedRisk = Number(today[0].total ?? 0);

  if (usedRisk + positionRisk > equity * MAX_DAILY_RISK) {
    return { allowed: false, reason: "MAX_DAILY_RISK_EXCEEDED" };
  }

  return { allowed: true, approvedQty };
}
