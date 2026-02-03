import { pool } from "@/lib/neon";

/* -----------------------------------------------
   CONFIG
------------------------------------------------ */
const MAX_RISK_PCT = 0.01;
const KELLY_FRACTION = 0.5;
const MAX_DAILY_LOSS_PCT = 0.03;
const MAX_CONSECUTIVE_LOSSES = 3;

/* -----------------------------------------------
   KELLY (FRACTIONAL, CAPPED)
------------------------------------------------ */
export async function computePositionSize(params: {
  balance: number;
  winRate: number;
  rewardRisk: number;
}) {
  const { balance, winRate, rewardRisk } = params;

  const kelly = (winRate * (rewardRisk + 1) - 1) / rewardRisk;

  const fractionalKelly = Math.max(0, kelly * KELLY_FRACTION);
  const capped = Math.min(fractionalKelly, MAX_RISK_PCT);

  return balance * capped;
}

/* -----------------------------------------------
   DAILY LOSS
------------------------------------------------ */
export async function checkDailyLoss() {
  const { rows } = await pool.query(
    `
    SELECT COALESCE(SUM(pnl), 0) AS pnl FROM (
      SELECT
        e.trade_id,
        SUM(
          CASE
            WHEN e.side = 'SELL' THEN
              (e.price - o.price) * e.qty
            ELSE 0
          END
        ) AS pnl
      FROM trade_executions e
      JOIN trade_executions o
        ON o.trade_id = e.trade_id
       AND o.side != e.side
      WHERE e.timestamp::date = CURRENT_DATE
      GROUP BY e.trade_id
    ) t
    `,
  );

  if (Number(rows[0].pnl) < -MAX_DAILY_LOSS_PCT) {
    throw new Error("MAX_DAILY_LOSS");
  }
}

/* -----------------------------------------------
   CONSECUTIVE LOSSES
------------------------------------------------ */
export async function checkConsecutiveLosses() {
  const { rows } = await pool.query(
    `
    SELECT pnl FROM (
      SELECT
        e.trade_id,
        SUM(
          CASE
            WHEN e.side = 'SELL' THEN
              (e.price - o.price) * e.qty
            ELSE 0
          END
        ) AS pnl
      FROM trade_executions e
      JOIN trade_executions o
        ON o.trade_id = e.trade_id
       AND o.side != e.side
      GROUP BY e.trade_id
      ORDER BY MAX(e.timestamp) DESC
      LIMIT $1
    ) t
    `,
    [MAX_CONSECUTIVE_LOSSES],
  );

  if (
    rows.length === MAX_CONSECUTIVE_LOSSES &&
    rows.every((r) => Number(r.pnl) < 0)
  ) {
    throw new Error("MAX_CONSECUTIVE_LOSSES");
  }
}
