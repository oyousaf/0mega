import { getBroker } from "@/providers/execution/router";
import { getPrice } from "@/providers";
import { evaluateSignal } from "./evaluateSignal";
import { calcPositionSize } from "./calcPositionSize";
import { getActiveSignals } from "@/lib/signals/provider";
import type { Signal } from "./types";
import type { Position } from "@/providers/execution/broker.interface";

export async function runAutomationTick() {
  const broker = getBroker();

  /* -------------------------------------------------
     PER-TICK GUARDS (IDEMPOTENCY)
  -------------------------------------------------- */
  const openedSymbols = new Set<string>();
  const partialClosed = new Set<string>();
  const fullyClosed = new Set<string>();

  let evaluated = 0;
  let executed = 0;

  /* -------------------------------------------------
     1. LOAD STATE
  -------------------------------------------------- */
  const [signals, positions, balance] = await Promise.all([
    getActiveSignals(),
    broker.fetchPositions(),
    broker.fetchBalance(),
  ]);

  if (!signals.length) {
    return {
      evaluated: 0,
      executed: 0,
      openTrades: positions.length,
      timestamp: new Date().toISOString(),
    };
  }

  /* -------------------------------------------------
     2. NORMALISE OPEN POSITIONS (SYMBOL → POSITION)
  -------------------------------------------------- */
  const openBySymbol = new Map<string, Position>();

  for (const p of positions) {
    if (!openBySymbol.has(p.symbol)) {
      openBySymbol.set(p.symbol, p);
    }
  }

  /* -------------------------------------------------
     3. PROCESS SIGNALS
  -------------------------------------------------- */
  for (const signal of signals as Signal[]) {
    evaluated++;

    try {
      const position = openBySymbol.get(signal.symbol);
      const hasOpenTrade = Boolean(position);

      const price = await getPrice(signal.symbol, signal.market);
      const intent = evaluateSignal(signal, price, hasOpenTrade);

      if (!intent) continue;

      /* -------------------------------------------------
         4. EXECUTE INTENT (GUARDED)
      -------------------------------------------------- */
      switch (intent.type) {
        case "OPEN": {
          if (hasOpenTrade) break;
          if (openedSymbols.has(signal.symbol)) break;
          if (!signal.sl) break;

          const qty = calcPositionSize({
            balance: balance.cash,
            riskPct: signal.riskPct ?? 0.01,
            entry: signal.entry_price,
            stop: signal.sl,
          });

          if (qty <= 0) break;

          await broker.placeOrder(signal.symbol, qty, signal.direction);

          openedSymbols.add(signal.symbol);
          executed++;
          break;
        }

        case "TP1_PARTIAL": {
          if (!position) break;
          if (partialClosed.has(position.id)) break;

          const halfQty = position.qty / 2;
          if (halfQty <= 0) break;

          await broker.closeOrder(position.id, halfQty);

          partialClosed.add(position.id);
          executed++;
          break;
        }

        case "TP2_CLOSE":
        case "SL_CLOSE":
        case "EXPIRED_CLOSE": {
          if (!position) break;
          if (fullyClosed.has(position.id)) break;

          await broker.closeOrder(position.id);

          fullyClosed.add(position.id);
          executed++;
          break;
        }
      }
    } catch (err) {
      console.error("Automation tick error:", signal.symbol, err);
    }
  }

  /* -------------------------------------------------
     5. METRICS (STATUS / UI / LOGGING)
  -------------------------------------------------- */
  return {
    evaluated,
    executed,
    opened: openedSymbols.size,
    partials: partialClosed.size,
    closes: fullyClosed.size,
    openTrades: positions.length,
    timestamp: new Date().toISOString(),
  };
}
