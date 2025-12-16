import { getBroker } from "@/providers/execution/router";
import { getPrice } from "@/providers";
import { evaluateSignal } from "./evaluateSignal";
import { calcPositionSize } from "./calcPositionSize";
import { getActiveSignals } from "@/lib/signals/provider";
import type { Signal } from "./types";
import type { Position } from "@/providers/execution/broker.interface";

export async function runAutomationTick() {
  const broker = getBroker();

  let evaluated = 0;
  let executed = 0;

  /* ----------------------------
     1. LOAD STATE
  ----------------------------- */
  const [signals, positions, balance] = await Promise.all([
    getActiveSignals(),
    broker.fetchPositions(),
    broker.fetchBalance(),
  ]);

  if (!signals.length) {
    return { evaluated: 0, executed: 0 };
  }

  /* ----------------------------
     2. INDEX OPEN POSITIONS
  ----------------------------- */
  const openBySymbol = new Map<string, Position>();
  for (const p of positions) {
    openBySymbol.set(p.symbol, p);
  }

  /* ----------------------------
     3. PROCESS SIGNALS
  ----------------------------- */
  for (const signal of signals as Signal[]) {
    evaluated++;

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

          if (qty <= 0) break;

          await broker.placeOrder(signal.symbol, qty, signal.direction);

          executed++;
          break;
        }

        case "TP1_PARTIAL": {
          if (!position) break;

          // Guard: only if qty > 50% original
          const half = position.qty / 2;
          if (half <= 0) break;

          await broker.closeOrder(position.id, half);
          executed++;
          break;
        }

        case "TP2_CLOSE":
        case "SL_CLOSE":
        case "EXPIRED_CLOSE": {
          if (!position) break;

          await broker.closeOrder(position.id);
          executed++;
          break;
        }
      }
    } catch (err) {
      console.error("Automation tick error:", signal.symbol, err);
    }
  }

  return {
    evaluated,
    executed,
    openTrades: positions.length,
    timestamp: new Date().toISOString(),
  };
}
