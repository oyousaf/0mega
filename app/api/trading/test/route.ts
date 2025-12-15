import { NextResponse } from "next/server";
import {
  executeTradeIntent,
  closeTrade,
} from "@/lib/trading/engine";

/**
 * TEMPORARY TEST ROUTE — SPRINT 16 ONLY
 *
 * GET /api/trading/test?action=open
 * GET /api/trading/test?action=close&tradeId=ID
 *
 * ❗ DELETE AFTER SPRINT 16
 */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    /* ---------------------------
       OPEN TRADE
    ---------------------------- */
    if (action === "open") {
      const result = await executeTradeIntent({
        symbol: "BTCUSDT",
        qty: 0.01,
        side: "BUY",
      });

      return NextResponse.json({ success: true, result });
    }

    /* ---------------------------
       CLOSE TRADE
    ---------------------------- */
    if (action === "close") {
      const tradeId = url.searchParams.get("tradeId");

      if (!tradeId) {
        return NextResponse.json(
          { success: false, error: "Missing tradeId" },
          { status: 400 }
        );
      }

      const result = await closeTrade(tradeId);

      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Invalid action. Use ?action=open or ?action=close",
      },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("Sprint-16 test route error:", err);

    return NextResponse.json(
      { success: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
