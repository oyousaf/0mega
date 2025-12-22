import { Candle } from "./candles.store";
import { setBacktestTime } from "@/lib/engine/context";
import { runEngine } from "@/lib/engine/runEngine";
import { SimulatedBrokerAdapter } from "@/lib/brokers/adapters/simulated.adapter";

/**
 * Deterministic candle replay.
 * Same engine. Virtual time. Simulated broker.
 */
export async function replayCandles(params: {
  market: "crypto" | "equity" | "forex";
  symbol: string;
  candles: Candle[];
  broker: SimulatedBrokerAdapter;
  onTick?: (c: Candle) => void;
}) {
  const { market, symbol, candles, broker, onTick } = params;

  for (const candle of candles) {
    // Advance virtual time
    setBacktestTime(candle.t);

    // Inject price into simulated broker
    broker.setPrice(symbol, candle.c);

    // Optional hook (charts, logs, metrics)
    onTick?.(candle);

    // Run the SAME engine used in live mode
    await runEngine();
  }
}
