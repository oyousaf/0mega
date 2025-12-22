import { Candle } from "./candles.store";
import { setBacktestTime } from "@/lib/engine/context";
import { runEngine } from "@/lib/engine/runEngine";
import { SimulatedBrokerAdapter } from "@/lib/brokers/adapters/simulated.adapter";
import { computeMetrics, EquityPoint, Metrics } from "./metrics";

/**
 * Deterministic candle replay.
 * Same engine. Virtual time. Simulated broker.
 * Returns backtest metrics.
 */
export async function replayCandles(params: {
  market: "crypto" | "equity" | "forex";
  symbol: string;
  candles: Candle[];
  broker: SimulatedBrokerAdapter;
  onTick?: (c: Candle) => void;
}): Promise<Metrics> {
  const { symbol, candles, broker, onTick } = params;

  const equityCurve: EquityPoint[] = [];

  for (const candle of candles) {
    // 1) Advance virtual time
    setBacktestTime(candle.t);

    // 2) Inject candle close price
    broker.setPrice(symbol, candle.c);

    // 3) Optional observer hook
    onTick?.(candle);

    // 4) Run canonical engine
    await runEngine();

    // 5) Capture equity AFTER engine step
    const balance = await broker.fetchBalance();
    equityCurve.push({
      t: candle.t,
      equity: balance[0].total,
    });
  }

  // 6) Compute deterministic metrics
  return computeMetrics(equityCurve, broker.getExecutions());
}
