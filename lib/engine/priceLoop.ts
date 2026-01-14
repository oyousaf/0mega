import { getPriceProvider } from "@/lib/prices/provider";
import { runStructureCheck } from "@/lib/strategies/marketStructure";
import { riskGate } from "@/lib/trading/risk/riskGate";
import { pool } from "@/lib/neon";
import { runExitWatcher } from "./exitWatcher";
import { executeTradeIntent } from "@/lib/trading/automation/executionHelpers";

/* ---------------------------------------
   CONFIG — PAPER FORWARD TEST
---------------------------------------- */
const SYMBOL = "BTCUSDT";
const TIMEFRAME = "1m";
const POLL_MS = 5000;

// Payoff geometry
const RR_TARGET = 1.25;

// Volatility filter
const VOL_WINDOW = 20;       // candles
const MIN_VOL_PCT = 0.0012; // 0.12%

/* ---------------------------------------
   LOOP CONTROL
---------------------------------------- */
declare global {
  // eslint-disable-next-line no-var
  var __OMEGA_PRICE_LOOP_ID__: number | undefined;
}

function nextLoopId() {
  const id = (globalThis.__OMEGA_PRICE_LOOP_ID__ ?? 0) + 1;
  globalThis.__OMEGA_PRICE_LOOP_ID__ = id;
  return id;
}

function currentLoopId() {
  return globalThis.__OMEGA_PRICE_LOOP_ID__ ?? 0;
}

/* ---------------------------------------
   HELPERS
---------------------------------------- */
function avgAbsReturnPct(closes: number[]) {
  if (closes.length < 3) return 0;
  let sum = 0;
  let count = 0;

  for (let i = 1; i < closes.length; i++) {
    const a = closes[i - 1];
    const b = closes[i];
    if (a > 0 && Number.isFinite(a) && Number.isFinite(b)) {
      sum += Math.abs(b - a) / a;
      count++;
    }
  }

  return count ? sum / count : 0;
}

/* ---------------------------------------
   PUBLIC API
---------------------------------------- */
export async function startPriceLoop() {
  const loopId = nextLoopId();
  console.log("[PRICE_LOOP] started", { loopId, SYMBOL, TIMEFRAME });

  const provider = getPriceProvider(SYMBOL, TIMEFRAME);
  let lastCandleTs: number | null = null;

  while (currentLoopId() === loopId) {
    const started = Date.now();

    try {
      const candles = await provider.fetchCandles();
      if (!candles.length) throw new Error("NO_CANDLES");

      const latest = candles[candles.length - 1];
      const price = Number(latest.close);

      /* EXIT — ALWAYS CHECK */
      await runExitWatcher(price);

      /* NEW CANDLE GATE */
      if (lastCandleTs === latest.timestamp) {
        // no new candle → skip entry logic
      } else {
        lastCandleTs = latest.timestamp;

        console.log("[PRICE_LOOP] candle", {
          ts: latest.timestamp,
          close: price,
        });

        /* VOLATILITY FILTER */
        const closes = candles
          .slice(-VOL_WINDOW)
          .map((c) => Number(c.close))
          .filter(Number.isFinite);

        const vol = avgAbsReturnPct(closes);
        if (vol < MIN_VOL_PCT) {
          console.log("[SKIP] low volatility", {
            volPct: (vol * 100).toFixed(3),
          });
        } else {
          /* STRUCTURE SIGNAL */
          const signal = await runStructureCheck({
            symbol: SYMBOL,
            timeframe: TIMEFRAME,
            candles,
          });

          if (signal) {
            const entry = price;
            const sl = Number(signal.sl);

            if (Number.isFinite(entry) && Number.isFinite(sl)) {
              const riskDist =
                signal.direction === "BUY" ? entry - sl : sl - entry;

              if (riskDist > entry * 0.0002) {
                const tp1 =
                  signal.direction === "BUY"
                    ? entry + riskDist * RR_TARGET
                    : entry - riskDist * RR_TARGET;

                const risk = await riskGate(signal, entry);

                if (risk.allowed) {
                  await withDbLock(async () => {
                    const { rows } = await pool.query(
                      `SELECT 1 FROM paper_trades WHERE is_closed = false LIMIT 1`
                    );
                    if (rows.length) return;

                    const res = await executeTradeIntent({
                      signalId: signal.reason,
                      symbol: SYMBOL,
                      qty: 1,
                      side: signal.direction,
                      rawSl: sl,
                      rawTp1: tp1,
                      entryPrice: entry,
                    });

                    if (res.success) {
                      console.log("[TRADE_OPENED]", {
                        tradeId: res.tradeId,
                        side: signal.direction,
                        entry,
                        sl,
                        tp1,
                        rr: RR_TARGET,
                        volPct: (vol * 100).toFixed(3),
                      });
                    }
                  });
                } else {
                  console.log("[ENTRY_BLOCKED]", risk.reason);
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("[PRICE_LOOP] error", err);
    }

    /* SINGLE SLEEP */
    const sleep = Math.max(POLL_MS - (Date.now() - started), 0);
    await new Promise((r) => setTimeout(r, sleep));
  }

  console.log("[PRICE_LOOP] exited cleanly");
}

export function stopPriceLoop() {
  nextLoopId();
  console.log("[PRICE_LOOP] stop requested");
}

/* ---------------------------------------
   DB LOCK
---------------------------------------- */
async function withDbLock(fn: () => Promise<void>) {
  await pool.query("BEGIN");
  try {
    await pool.query("SELECT pg_advisory_xact_lock(424242)");
    await fn();
    await pool.query("COMMIT");
  } catch (e) {
    await pool.query("ROLLBACK");
    throw e;
  }
}
