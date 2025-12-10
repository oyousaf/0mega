import { NextResponse } from "next/server";
import { getBroker } from "@/providers/execution/router";
import { getPrice } from "@/providers/index";

export async function GET() {
  const broker = getBroker();

  const trades = await broker.getOpenTrades();
  const balance = await broker.getBalance();

  const enriched = await Promise.all(
    trades.map(async (t) => {
      const price = await getPrice(t.symbol, "crypto");

      const pnl =
        t.side === "BUY"
          ? (price - t.entryPrice) * t.qty
          : (t.entryPrice - price) * t.qty;

      return {
        ...t,
        currentPrice: price,
        pnl,
      };
    })
  );

  return NextResponse.json({
    trades: enriched,
    balance,
  });
}
