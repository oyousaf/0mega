import { Candle } from "./candles.store";
import { setBacktestTime } from "@/lib/engine/context";
import { runEngine } from "../engine/runEngine";


export async function replayCandles(
  candles: Candle[],
  onTick?: (c: Candle) => void
) {
  for (const c of candles) {
    setBacktestTime(c.t);
    onTick?.(c);
    await runEngine();
  }
}
