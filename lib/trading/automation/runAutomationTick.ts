import { getBroker } from "@/providers/execution/router";
import { getPrice } from "@/providers";
import { evaluateSignal } from "./evaluateSignal";
import { calcPositionSize } from "./calcPositionSize";
import { getActiveSignals } from "@/lib/signals/provider";
import type { AutomationSignal } from "./types";

export async function runAutomationTick() {
  const broker = getBroker();

  const [signals, positions, balance] = await Promise.all([
    getActiveSignals() as Promise<AutomationSignal[]>,
    broker.fetchPositions(),
    broker.fetchBalance(),
  ]);

  if (!signals.length) return;

  const openBySymbol = new Map(positions.map((p) => [p.symbol, p]));

  for (const signal of signals) {
    try {
      const position = openBySymbol.get(signal.symbol);
      const hasOpenTrade = Boolean(position);

      const price = await getPrice(signal.symbol, signal.market);
      const intent = evaluateSignal(signal, price, hasOpenTrade);

      if (!intent) continue;

      switch (intent.type) {
        case "OPEN": {
          if (hasOpenTrade || !signal.sl) break;

          const qty = calcPositionSize({
            balance: balance.cash,
            riskPct: signal.riskPct ?? 0.01,
            entry: signal.entry_price,
            stop: signal.sl,
          });

          if (qty > 0) {
            await broker.placeOrder(signal.symbol, qty, signal.direction);
          }
          break;
        }

        case "TP1_PARTIAL": {
          if (position) {
            await broker.closeOrder(position.id, position.qty / 2);
          }
          break;
        }

        case "TP2_CLOSE":
        case "SL_CLOSE":
        case "EXPIRED_CLOSE": {
          if (position) {
            await broker.closeOrder(position.id);
          }
          break;
        }
      }
    } catch (err) {
      console.error("Automation tick error:", signal.symbol, err);
    }
  }
}
