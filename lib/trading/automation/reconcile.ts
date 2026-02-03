import { pool } from "@/lib/neon";
import { getBroker } from "@/providers/execution/router";

export async function reconcilePositions() {
  const broker = getBroker();
  const brokerPositions = await broker.fetchPositions();

  const { rows: dbTrades } = await pool.query(
    `SELECT id, symbol, qty FROM paper_trades`,
  );

  for (const trade of dbTrades) {
    const match = brokerPositions.find((p: any) => p.symbol === trade.symbol);

    if (!match) {
      console.warn("Orphaned DB trade:", trade.id);
    }
  }
}
