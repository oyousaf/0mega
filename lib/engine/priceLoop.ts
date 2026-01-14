import { getPriceProvider } from "@/lib/prices/provider";
import { runStructureCheck } from "@/lib/strategies/marketStructure";
import { riskGate } from "@/lib/trading/risk/riskGate";
import { pool } from "@/lib/neon";
import { runExitWatcher } from "./exitWatcher";
import { executeTradeIntent } from "@/lib/trading/automation/executionHelpers";

/* ---------------------------------------
   CONFIG — FAST PAPER MODE
---------------------------------------- */
const SYMBOL = "BTCUSDT";
const POLL_MS = 5000;

// Payoff geometry
const RR_TARGET = 1.25;

// Volatility filter
const VOL_WINDOW = 20; // candles
const MIN_VOL_PCT = 0.0012; // 0.12% average abs move per candle

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

function avgAbsReturnPct(closes: number[]) {
  if (closes.length < 3) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 1; i < closes.length; i++) {
    const a = closes[i - 1];
    const b = closes[i];
    if (!(a > 0) || !Number.isFinite(a) || !Number.isFinite(b)) continue;
    sum += Math.abs(b - a) / a;
    count++;
  }
  return count ? sum / count : 0;
}

/* ---------------------------------------
   PUBLIC API
---------------------------------------- */
export async function startPriceLoop() {
  const loopId = nextLoopId();
  console.log("[PRICE_LOOP] started loopId=", loopId);

  const provider = getPriceProvider(SYMBOL, "1m");

  while (currentLoopId() === loopId) {
    const started = Date.now();

    try {
      const candles = await provider.fetchCandles();
      const latest = candles[candles.length - 1];

      /* EXIT — every tick */
      const exited = await runExitWatcher(latest.close);
      if (exited) console.log("[EXIT] trade closed");

      console.log("[PRICE_LOOP] tick", {
        ts: latest.timestamp,
        close: latest.close,
      });

      /* VOL FILTER (skip chop) */
      const closes = candles
        .slice(-VOL_WINDOW)
        .map((c) => Number(c.close))
        .filter((v) => Number.isFinite(v));

      const vol = avgAbsReturnPct(closes);
      if (vol < MIN_VOL_PCT) {
        continue;
      }

      /* ENTRY */
      const signal = await runStructureCheck({
        symbol: SYMBOL,
        timeframe: "1m",
        candles,
      });

      if (signal) {
        const entry = Number(latest.close);
        const sl = Number(signal.sl);

        if (!Number.isFinite(entry) || !Number.isFinite(sl)) continue;

        const riskDist = signal.direction === "BUY" ? entry - sl : sl - entry;

        // basic sanity: avoid tiny SL distance
        if (!(Number.isFinite(riskDist) && riskDist > entry * 0.0002)) {
          continue;
        }

        // RR target TP
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
                rrTarget: RR_TARGET,
                volPct: Number((vol * 100).toFixed(3)),
              });
            }
          });
        } else {
          console.log("[ENTRY_BLOCKED]", { reason: risk.reason });
        }
      }
    } catch (err) {
      console.error("[PRICE_LOOP] error", err);
    }

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
