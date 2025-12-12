import { NextResponse } from "next/server";
import { getBroker } from "@/providers/execution/router";
import { getPrice } from "@/providers/index";

/* -------------------------------------------------------
   MARKET DETECTION
------------------------------------------------------- */
function detectMarket(symbol: string): "crypto" | "forex" | "stock" {
  const upper = symbol.toUpperCase();

  if (
    upper.endsWith("USD") ||
    upper.endsWith("USDT") ||
    upper.endsWith("BTC") ||
    upper.endsWith("ETH")
  ) {
    return "crypto";
  }

  if (/^[A-Z]{6}$/.test(upper)) {
    return "forex";
  }

  return "stock";
}

/* -------------------------------------------------------
   SAFE HELPERS
------------------------------------------------------- */
function safeISO(input: any) {
  const d = new Date(input);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function n(val: any): number {
  const v = Number(val);
  return isFinite(v) ? v : 0;
}

/* -------------------------------------------------------
   ROUTE: GET /api/trading/open
------------------------------------------------------- */
export async function GET() {
  try {
    const broker = getBroker();

    const rawTrades = await broker.getOpenTrades();
    const balance = n(await broker.getBalance());

    const trades = await Promise.all(
      rawTrades.map(async (t) => {
        const openedISO = safeISO(t.openedAt);
        const symbol = t.symbol?.toUpperCase() ?? "UNKNOWN";
        const market = detectMarket(symbol);

        let livePrice = n(t.entryPrice);

        // --------------------------
        // SAFE PRICE FETCH
        // --------------------------
        try {
          const price = await getPrice(symbol, market);
          if (typeof price === "number" && !Number.isNaN(price)) {
            livePrice = price;
          } else {
            console.warn(`${market} price invalid for ${symbol}`);
          }
        } catch {
          console.warn(`Price fetch failed for ${symbol}, fallback to entry`);
        }

        const entry = n(t.entryPrice);
        const qty = n(t.qty);

        const pnl =
          t.side === "BUY"
            ? (livePrice - entry) * qty
            : (entry - livePrice) * qty;

        return {
          trade_id: String(t.id),
          symbol,
          side: t.side === "BUY" ? "LONG" : "SHORT",
          strategy: "Unknown",

          entry_price: entry,
          entry_fill_price: entry,
          exit_fill_price: null,

          realised_pl: pnl,
          rr: null,

          qty,
          opened_at: openedISO,
          closed_at: null,
          is_closed: false,

          halaal: true,

          executions: [
            {
              exec_id: `open-${t.id}`,
              price: entry,
              qty,
              side: "OPEN",
              time: openedISO,
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
      { success: false, error: String(err.message || err) },
      { status: 500 }
    );
  }
}
