import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";
import { getBroker } from "@/providers/execution/router";

export async function GET() {
  try {
    const broker = getBroker();

    const [
      balance,
      positions,
      { rows: openTrades },
      { rows: executions },
    ] = await Promise.all([
      broker.fetchBalance(),
      broker.fetchPositions(),
      pool.query(`SELECT COUNT(*) FROM paper_trades`),
      pool.query(`SELECT COUNT(*) FROM trade_executions`),
    ]);

    return NextResponse.json({
      success: true,
      automation: {
        enabled: true,
        mode: "manual",
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
      {
        success: false,
        error: err.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
