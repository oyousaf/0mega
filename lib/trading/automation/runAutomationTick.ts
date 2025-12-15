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
  const opened = new Set<string>();           // symbol
  const partiallyClosed = new Set<string>();  // position.id
  const fullyClosed = new Set<string>();      // position.id

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
    return { evaluated: 0, executed: 0 };
  }

  /* -------------------------------------------------
     2. NORMALISE OPEN POSITIONS
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
          if (opened.has(signal.symbol)) break;
          if (!signal.sl) break;

          const qty = calcPositionSize({
            balance: balance.cash,
            riskPct: signal.riskPct ?? 0.01,
            entry: signal.entry_price,
            stop: signal.sl,
          });

          if (qty <= 0) break;

          await broker.placeOrder(
            signal.symbol,
            qty,
            signal.direction
          );

          opened.add(signal.symbol);
          executed++;
          break;
        }

        case "TP1_PARTIAL": {
          if (!position) break;
          if (partiallyClosed.has(position.id)) break;

          const half = position.qty / 2;
          if (half <= 0) break;

          await broker.closeOrder(position.id, half);

          partiallyClosed.add(position.id);
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
     5. RETURN METRICS (FOR STATUS UI / LOGGING)
  -------------------------------------------------- */
  return {
    evaluated,
    executed,
    opened: opened.size,
    partials: partiallyClosed.size,
    closes: fullyClosed.size,
    timestamp: new Date().toISOString(),
  };
}
