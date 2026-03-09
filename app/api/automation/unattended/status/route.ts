import { NextResponse } from "next/server";

declare global {
  var __OMEGA_PRICE_LOOP_ID__: number | undefined;
  var __OMEGA_ENGINE_RUNNING__: boolean | undefined;
}

export async function GET() {
  const running = Boolean(globalThis.__OMEGA_ENGINE_RUNNING__);
  const loopId = globalThis.__OMEGA_PRICE_LOOP_ID__ ?? 0;

  return NextResponse.json({
    running,
    loopId,
    symbol: "EURUSD",
    timeframe: "1m",
    engine: "OMEGA-30",
  });
}
