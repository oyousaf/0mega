import { NextResponse } from "next/server";
import { getBroker } from "@/providers/execution/router";

export async function GET() {
  const broker = getBroker();
  const trades = await broker.getOpenTrades();
  const balance = await broker.getBalance();

  return NextResponse.json({ trades, balance });
}
