"use server";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getBroker } from "@/providers/execution/router";
import { startPriceLoop, stopPriceLoop } from "@/lib/engine/priceLoop";

/* -------------------------------------------------
GLOBAL ENGINE STATE
-------------------------------------------------- */

declare global {
  var __OMEGA_ENGINE_RUNNING__: boolean | undefined;
}

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
      { rows: automationRows },
    ] = await Promise.all([
      broker.fetchBalance(),
      broker.fetchPositions(),
      pool.query(`SELECT COUNT(*)::int FROM paper_trades`),
      pool.query(`SELECT COUNT(*)::int FROM trade_executions`),
      pool.query(`SELECT enabled FROM automation_state WHERE id = 1 LIMIT 1`),
    ]);

    const enabled = Boolean(automationRows[0]?.enabled);
    return NextResponse.json({
      success: true,

      automation: {
        enabled,
        mode: enabled ? "auto" : "manual",
      },

      engine: {
        running: Boolean(globalThis.__OMEGA_ENGINE_RUNNING__),
      },

      broker: {
        name: "paper",
        balance,
        openPositions: positions.length,
      },

      database: {
        paper_trades: Number(openTrades[0]?.count ?? 0),
        trade_executions: Number(executions[0]?.count ?? 0),
      },

      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error("[AUTOMATION_STATUS_ERROR]", err);

    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Status unavailable",
      },
      { status: 500 },
    );
  }
}

/* -------------------------------------------------
TOGGLE AUTOMATION
-------------------------------------------------- */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nextState = Boolean(body?.enabled);

    await pool.query(
      `
      UPDATE automation_state
      SET enabled = $1, updated_at = now()
      WHERE id = 1
      `,
      [nextState],
    );

    const engineRunning = Boolean(globalThis.__OMEGA_ENGINE_RUNNING__);

    /* --------------------------
       ENGINE CONTROL
    --------------------------- */

    if (nextState && !engineRunning) {
      console.log("[AUTOMATION] starting engine");

      setTimeout(() => {
        void startPriceLoop().catch((err) => {
          console.error("[ENGINE_START_FAILED]", err);
        });
      }, 250);
    }

    if (!nextState && engineRunning) {
      console.log("[AUTOMATION] stopping engine");

      stopPriceLoop();

    }

    return NextResponse.json({
      success: true,
      enabled: nextState,
      engineRunning: Boolean(globalThis.__OMEGA_ENGINE_RUNNING__),
    });
  } catch (err: unknown) {
    console.error("[AUTOMATION_TOGGLE_ERROR]", err);

    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Toggle failed",
      },
      { status: 500 },
    );
  }
}
