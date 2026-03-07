import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";
import { getBroker } from "@/providers/execution/router";
import { startPriceLoop, stopPriceLoop } from "@/lib/engine/priceLoop";

/* -------------------------------------------------
   AUTOMATION STATUS
-------------------------------------------------- */
export async function GET() {
  try {
    const broker = getBroker();

    const [
      balance,
      positions,
      { rows: openTrades },
      { rows: executions },
      { rows: automation },
    ] = await Promise.all([
      broker.fetchBalance(),
      broker.fetchPositions(),
      pool.query(`SELECT COUNT(*) FROM paper_trades`),
      pool.query(`SELECT COUNT(*) FROM trade_executions`),
      pool.query(`SELECT enabled FROM automation_state WHERE id = 1`),
    ]);

    return NextResponse.json({
      success: true,

      automation: {
        enabled: Boolean(automation[0]?.enabled),
        mode: automation[0]?.enabled ? "auto" : "manual",
      },

      broker: {
        name: "paper",
        balance,
        openPositions: positions.length,
      },

      database: {
        paper_trades: Number(openTrades[0].count),
        trade_executions: Number(executions[0].count),
      },

      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Automation status error:", err);

    return NextResponse.json(
      { success: false, error: err.message ?? String(err) },
      { status: 500 },
    );
  }
}

/* -------------------------------------------------
   TOGGLE AUTOMATION
-------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const { enabled } = await req.json();
    const nextState = Boolean(enabled);

    await pool.query(
      `
      UPDATE automation_state
      SET enabled = $1, updated_at = now()
      WHERE id = 1
      `,
      [nextState],
    );

    /* --------------------------
       ENGINE CONTROL
    --------------------------- */

    if (nextState) {
      console.log("[AUTOMATION] starting engine");
      startPriceLoop();
    } else {
      console.log("[AUTOMATION] stopping engine");
      stopPriceLoop();
    }

    return NextResponse.json({
      success: true,
      enabled: nextState,
    });
  } catch (err: any) {
    console.error("Automation toggle error:", err);

    return NextResponse.json(
      { success: false, error: err.message ?? String(err) },
      { status: 500 },
    );
  }
}
