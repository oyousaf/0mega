import { NextResponse } from "next/server";
import { getBroker } from "@/providers/execution/router";
import { getPrice } from "@/providers/index";

export async function GET() {
  try {
    const broker = getBroker();

    // Broker returns OpenTrade[] from YOUR provider
    const rawTrades = await broker.getOpenTrades();
    const balance = await broker.getBalance();

    const trades = await Promise.all(
      rawTrades.map(async (t) => {
        // broker returns openedAt → convert to ISO
        const openedAt = t.openedAt
          ? new Date(t.openedAt).toISOString()
          : new Date().toISOString();

        const livePrice = await getPrice(t.symbol, "crypto");

        // Unrealised P/L
        const pnl =
          t.side === "BUY"
            ? (livePrice - t.entryPrice) * t.qty
            : (t.entryPrice - livePrice) * t.qty;

        return {
          trade_id: String(t.id),
          symbol: t.symbol,

          // BUY/SELL → LONG/SHORT
          side: t.side === "BUY" ? "LONG" : "SHORT",

          strategy: "Unknown",

          entry_price: t.entryPrice,
          entry_fill_price: t.entryPrice,

          exit_fill_price: null,
          realised_pl: pnl,
          rr: null,

          qty: t.qty,
          opened_at: openedAt,
          closed_at: null,
          is_closed: false,

          executions: [
            {
              exec_id: `open-${t.id}`,
              price: t.entryPrice,
              qty: t.qty,
              side: "OPEN",
              time: openedAt,
              broker: "paper",
            },
          ],
        };
      })
    );

    return NextResponse.json({ trades, balance });
  } catch (err: any) {
    console.error("Open trades API error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
