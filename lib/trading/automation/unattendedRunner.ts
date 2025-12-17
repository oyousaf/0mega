import { pool } from "@/lib/neon";
import { fetchPrices } from "@/lib/market/priceFeed";
import { automationTick } from "./scheduler";
import { isAutomationEnabled } from "./automationState";

export async function unattendedRun() {
  if (!isAutomationEnabled()) return;

  const { rows: signals } = await pool.query(
    `SELECT id, symbol FROM signals WHERE status = 'ACTIVE'`
  );

  if (!signals.length) return;

  const signalIds = signals.map((s) => s.id);
  const symbols = [...new Set(signals.map((s) => s.symbol))];

  const prices = await fetchPrices(symbols);

  const priceMap: Record<string, number> = {};
  for (const s of signals) {
    if (prices[s.symbol]) {
      priceMap[s.id] = prices[s.symbol];
    }
  }

  await automationTick(signalIds, priceMap);
}
