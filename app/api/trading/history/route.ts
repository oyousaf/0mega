import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

interface ExecutionRow {
  exec_id: number;
  exec_price: number;
  exec_qty: number;
  exec_side: string;
  exec_time: string | null;
  broker: string | null;
}

interface TradeRow {
  trade_id: number;
  symbol: string;
  trade_side: string;
  entry_price: number;
  trade_qty: number;
  opened_at: string;

  strategy: string | null;
  sl: number | null;

  exec_id: number | null;
  exec_price: number | null;
  exec_qty: number | null;
  exec_side: string | null;
  exec_time: string | null;
  broker: string | null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const { rows } = await pool.query<TradeRow>(
      `
      SELECT
        pt.id AS trade_id,
        pt.symbol,
        pt.side AS trade_side,
        pt.entry_price,
        pt.qty AS trade_qty,
        pt.opened_at,

        s.strategy,
        s.sl,

        te.id AS exec_id,
        te.price AS exec_price,
        te.qty AS exec_qty,
        te.side AS exec_side,
        te.timestamp AS exec_time,
        te.broker

      FROM paper_trades pt

      /* ✅ FIXED JOIN — real FK column */
      LEFT JOIN trade_executions te
        ON te.trade_id = pt.id

      LEFT JOIN signals s
        ON s.id = te.signal_id

      ORDER BY pt.id DESC, te.timestamp ASC
      LIMIT $1 OFFSET $2;
      `,
      [limit, offset]
    );

    /* -------------------------
       GROUP BY TRADE
    --------------------------*/
    const grouped = new Map<number, any>();

    for (const r of rows) {
      if (!grouped.has(r.trade_id)) {
        grouped.set(r.trade_id, {
          trade_id: r.trade_id,
          symbol: r.symbol,
          side: r.trade_side,
          entry_price: Number(r.entry_price),
          qty: Number(r.trade_qty),
          opened_at: r.opened_at,

          strategy: r.strategy ?? "Unknown",
          sl: r.sl ? Number(r.sl) : null,

          executions: [] as ExecutionRow[],
        });
      }

      if (r.exec_id !== null) {
        grouped.get(r.trade_id).executions.push({
          exec_id: r.exec_id,
          exec_price: Number(r.exec_price),
          exec_qty: Number(r.exec_qty),
          exec_side: r.exec_side || "",
          exec_time: r.exec_time,
          broker: r.broker,
        });
      }
    }

    /* -------------------------
       COMPUTE ANALYTICS
    --------------------------*/
    const results: any[] = [];

    for (const trade of grouped.values()) {
      const executions = trade.executions;

      const opens = executions.filter((e: any) => e.exec_side === "OPEN");
      const closes = executions.filter((e: any) => e.exec_side === "CLOSE");

      const entry_fill = opens.length
        ? opens.reduce(
            (sum: number, e: any) => sum + e.exec_price * e.exec_qty,
            0
          ) / opens.reduce((sum: number, e: any) => sum + e.exec_qty, 0)
        : trade.entry_price;

      let exit_fill = null;
      let realised_pl = null;
      let closed_at = null;
      let rr = null;

      if (closes.length > 0) {
        exit_fill =
          closes.reduce(
            (sum: number, e: any) => sum + e.exec_price * e.exec_qty,
            0
          ) / closes.reduce((sum: number, e: any) => sum + e.exec_qty, 0);

        closed_at = closes[closes.length - 1].exec_time ?? null;

        realised_pl =
          trade.side === "LONG"
            ? (exit_fill - entry_fill) * trade.qty
            : (entry_fill - exit_fill) * trade.qty;

        if (trade.sl !== null) {
          const risk = Math.abs(entry_fill - trade.sl);
          const reward =
            trade.side === "LONG"
              ? Math.abs(exit_fill - entry_fill)
              : Math.abs(entry_fill - exit_fill);

          rr = risk > 0 ? reward / risk : null;
        }
      }

      results.push({
        trade_id: trade.trade_id,
        symbol: trade.symbol,
        side: trade.side,

        strategy: trade.strategy,
        sl: trade.sl,

        entry_price: trade.entry_price,
        entry_fill_price: entry_fill,

        exit_fill_price: exit_fill,
        realised_pl,
        rr,

        qty: trade.qty,
        opened_at: trade.opened_at,
        closed_at,
        is_closed: exit_fill !== null,

        executions,
      });
    }

    return NextResponse.json({ success: true, trades: results });
  } catch (err: any) {
    console.error("History API error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
