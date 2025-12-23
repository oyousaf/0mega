import { NextResponse } from "next/server";
import { brokerRouter } from "@/lib/brokers";
import { isUsMarketOpen } from "@/lib/market/usMarketHours";

export const dynamic = "force-dynamic";

export async function GET() {
  const report: Record<string, any> = {
    ok: true,
    checks: {},
    timestamp: new Date().toISOString(),
  };

  try {
    /* -------------------------------------------------
       1) Balance
    -------------------------------------------------- */
    const balance = await brokerRouter.fetchBalance("equity");
    report.checks.balance = {
      ok: true,
      balance,
    };

    /* -------------------------------------------------
       2) Positions
    -------------------------------------------------- */
    const positions = await brokerRouter.fetchPositions("equity");
    report.checks.positions = {
      ok: true,
      positions,
    };

    /* -------------------------------------------------
       3) Market hours
    -------------------------------------------------- */
    const marketOpen = isUsMarketOpen();
    report.checks.marketHours = {
      ok: true,
      marketOpen,
    };

    /* -------------------------------------------------
       4) Short block (expected failure)
    -------------------------------------------------- */
    try {
      await brokerRouter.placeOrder({
        market: "equity",
        symbol: "AAPL",
        side: "SELL",
        qty: 1,
      });

      report.checks.shortBlock = {
        ok: false,
        error: "SHORT_NOT_BLOCKED",
      };
    } catch (err: any) {
      report.checks.shortBlock = {
        ok: true,
        error: err?.message,
      };
    }

    /* -------------------------------------------------
       5) BUY (only if market open)
    -------------------------------------------------- */
    if (marketOpen) {
      try {
        const res = await brokerRouter.placeOrder({
          market: "equity",
          symbol: "AAPL",
          side: "BUY",
          qty: 1,
        });

        report.checks.buyOrder = {
          ok: true,
          orderId: res.orderId,
        };
      } catch (err: any) {
        report.checks.buyOrder = {
          ok: false,
          error: err?.message,
        };
      }
    } else {
      report.checks.buyOrder = {
        ok: true,
        skipped: "US_MARKET_CLOSED",
      };
    }

    return NextResponse.json(report);
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "UNKNOWN_ERROR",
        stack: err?.stack,
        report,
      },
      { status: 500 }
    );
  }
}
