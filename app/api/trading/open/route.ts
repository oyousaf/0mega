import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

/* ---------------------------------------------
   Canonical mark price resolver (FINAL)
--------------------------------------------- */
async function getMarkPrice(symbol: string): Promise<number> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/prices/crypto/${symbol}`,
      { cache: "no-store" }
    );

    if (!res.ok) return 0;
    const json = await res.json();

    /*
      Omega-safe resolution.
      Covers:
      - { price: "90380.12" }
      - { last: 90380.12 }
      - { data: { price / last } }
      - { result: { price } }
    */
    const price =
      Number(json.price) ||
      Number(json.last) ||
      Number(json.close) ||
      Number(json?.data?.price) ||
      Number(json?.data?.last) ||
      Number(json?.result?.price) ||
      0;

    return Number.isFinite(price) ? price : 0;
  } catch {
    return 0;
  }
}

/* ---------------------------------------------
   OPEN TRADES (PAPER + LIVE MARK)
--------------------------------------------- */
export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT
        id AS trade_id,
        symbol,
        side,
        entry_price,
        qty,
        opened_at,
        sl,
        tp1,
        rr
      FROM paper_trades
      WHERE is_closed = false
      ORDER BY opened_at DESC
    `);

    const trades = await Promise.all(
      rows.map(async (t: any) => {
        const mark = await getMarkPrice(t.symbol);

        const unrealised =
          t.side === "BUY"
            ? (mark - t.entry_price) * t.qty
            : (t.entry_price - mark) * t.qty;

        return {
          trade_id: t.trade_id,
          symbol: t.symbol,
          side: t.side,
          entry_price: Number(t.entry_price),
          qty: Number(t.qty),
          opened_at: t.opened_at,
          sl: t.sl,
          tp1: t.tp1,
          rr: t.rr,
          mark_price: mark,
          unrealised_pl: Number.isFinite(unrealised) ? unrealised : 0,
        };
      })
    );

    return NextResponse.json({
      positions: trades,
      balance: 100000,
    });
  } catch (err: any) {
    console.error("Open trades route failed", err);
    return NextResponse.json(
      { error: err.message || String(err) },
      { status: 500 }
    );
  }
}
