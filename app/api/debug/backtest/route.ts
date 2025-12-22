import { NextResponse } from "next/server";
import { putCandles } from "@/lib/backtest/candles.store";
import { replayCandles } from "@/lib/backtest/replay";
import { SimulatedBrokerAdapter } from "@/lib/brokers/adapters/simulated.adapter";

export async function GET() {
  const candles = [
    { t: 1, o: 100, h: 101, l: 99, c: 100, v: 1 },
    { t: 2, o: 100, h: 102, l: 100, c: 101, v: 1 },
    { t: 3, o: 101, h: 103, l: 100, c: 102, v: 1 },
  ];

  const broker = new SimulatedBrokerAdapter("crypto");

  await replayCandles({
    market: "crypto",
    symbol: "BTCUSDT",
    candles,
    broker,
  });

  return NextResponse.json({ ok: true });
}
