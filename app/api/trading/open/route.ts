import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { RISK_CONFIG } from "@/lib/trading/config/riskConfig";

/* ---------------------------------------------
   CONFIG (aligned with trading engine)
--------------------------------------------- */

const ACCOUNT_BALANCE = RISK_CONFIG.initialEquity;
const PIP_SIZE = 0.0001;
const PIP_VALUE_PER_LOT = 10;

type OpenTradeRow = {
  trade_id: number;
  symbol: string;
  side: "BUY" | "SELL";
  entry_price: number;
  qty: number;
  opened_at: string;
  sl: number | null;
  tp1: number | null;
  rr: number | null;
};

/* ---------------------------------------------
   PRICE RESOLVER
--------------------------------------------- */

async function getMarkPrice(
  origin: string,
  symbol: string,
): Promise<number | null> {
  try {
    const isForex = symbol.length === 6;

    const url = isForex
      ? `${origin}/api/prices/forex/${symbol}`
      : `${origin}/api/prices/crypto/${symbol}`;

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) return null;

    const json = await res.json();

    const price =
      Number(json.price) ||
      Number(json.last) ||
      Number(json.close) ||
      Number(json?.data?.price) ||
      Number(json?.data?.last) ||
      Number(json?.result?.price);

    return Number.isFinite(price) ? price : null;
  } catch {
    return null;
  }
}

/* ---------------------------------------------
   PNL CALCULATOR
--------------------------------------------- */

function calculatePnL(
  side: "BUY" | "SELL",
  entry: number,
  mark: number,
  lots: number,
) {
  const diff = side === "BUY" ? mark - entry : entry - mark;

  const pips = diff / PIP_SIZE;

  return pips * lots * PIP_VALUE_PER_LOT;
}

/* ---------------------------------------------
   OPEN TRADES ROUTE
--------------------------------------------- */

export async function GET(req: Request) {
  try {
    const origin = new URL(req.url).origin;

    const { rows } = await pool.query<OpenTradeRow>(`
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

    const positions = await Promise.all(
      rows.map(async (t) => {
        const entry = Number(t.entry_price);
        const qty = Number(t.qty);

        const mark = await getMarkPrice(origin, t.symbol);

        const unrealised =
          mark != null ? calculatePnL(t.side, entry, mark, qty) : null;

        return {
          trade_id: Number(t.trade_id),
          symbol: t.symbol,
          side: t.side,
          entry_price: entry,
          qty,
          opened_at: t.opened_at,
          sl: t.sl != null ? Number(t.sl) : null,
          tp1: t.tp1 != null ? Number(t.tp1) : null,
          rr: t.rr != null ? Number(t.rr) : null,
          mark_price: mark,
          unrealised_pl: unrealised,
        };
      }),
    );

    return NextResponse.json({
      positions,
      balance: ACCOUNT_BALANCE,
    });
  } catch (err: unknown) {
    console.error("Open trades route failed", err);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Positions unavailable" },
      { status: 500 },
    );
  }
}
