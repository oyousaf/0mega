import { NextResponse } from "next/server";
import { getBroker } from "@/providers/execution/router";

/* ---------------------------------------------
   OPEN TRADES (UI-ADAPTED)
--------------------------------------------- */
export async function GET() {
  try {
    const broker = getBroker();

    const [positions, balance] = await Promise.all([
      broker.fetchPositions(),
      broker.fetchBalance(),
    ]);

    const trades = positions.map((p) => ({
      trade_id: p.id,
      symbol: p.symbol,
      side: p.side,
      qty: p.qty,

      entry_price: p.avgPrice,
      entry_fill_price: p.avgPrice,

      realised_pl: 0, // unrealised only for now
      strategy: "Structure",
      rr: null,

      halaal: true,
      executions: [],
    }));

    return NextResponse.json({
      trades,
      balance: balance.equity,
    });
  } catch (err: any) {
    console.error("Open positions API error:", err);
    return NextResponse.json(
      { error: err.message || String(err) },
      { status: 500 }
    );
  }
}
