import { pool } from "@/lib/neon";
import { calculatePositionSize } from "./positionSizing";

const MAX_RISK_PER_TRADE = 0.01;
const MAX_DAILY_RISK = 0.03;

type RiskResult = { allowed: true } | { allowed: false; reason: string };

export async function riskGate(
  signal: any,
  price: number
): Promise<RiskResult> {
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
    stopLoss: signal.sl,
    riskPct: MAX_RISK_PER_TRADE,
  });

  if (approvedQty <= 0) {
    return { allowed: false, reason: "POSITION_SIZE_ZERO" };
  }

  if (approvedQty < signal.qty) {
    return { allowed: false, reason: "POSITION_TOO_LARGE" };
  }

  const tradeRisk = Math.abs(price - signal.sl) * signal.qty;

  const { rows: used } = await pool.query(
    `
    SELECT COALESCE(SUM(risk_amount), 0) AS total
    FROM trade_executions
    WHERE created_at::date = CURRENT_DATE
      AND status = 'SUCCESS'
    `
  );

  if (Number(used[0].total) + tradeRisk > equity * MAX_DAILY_RISK) {
    return { allowed: false, reason: "MAX_DAILY_RISK_EXCEEDED" };
  }

  return { allowed: true };
}
