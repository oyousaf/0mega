import { NextResponse } from "next/server";
import { getBroker } from "@/providers/execution/router";
import { getPrice } from "@/providers/index";

/* -------------------------------------------------------
   MARKET DETECTION
   Crypto → ends with USD/USDT/BTC/ETH
   Forex  → strictly 6-letter pairs like GBPUSD, EURJPY
   Stock  → fallback
------------------------------------------------------- */
function detectMarket(symbol: string): "crypto" | "forex" | "stock" {
  const upper = symbol.toUpperCase();

  // CRYPTO FIRST (BTCUSD, ETHUSD, SOLUSD, XRPUSD etc)
  if (
    upper.endsWith("USD") ||
    upper.endsWith("USDT") ||
    upper.endsWith("BTC") ||
    upper.endsWith("ETH")
  ) {
    return "crypto";
  }

  // FOREX (must come after crypto)
  if (/^[A-Z]{6}$/.test(upper)) {
    return "forex";
  }

  return "stock";
}

/* -------------------------------------------------------
   SAFE ISO DATE
------------------------------------------------------- */
function safeISO(input: any) {
  const d = new Date(input);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/* -------------------------------------------------------
   SAFE NUMBER
------------------------------------------------------- */
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

        let livePrice = n(t.entryPrice); // safe fallback

        /* -----------------------------------------
           SAFE PRICE FETCH
           - Never breaks
           - Never returns NaN
        ------------------------------------------ */
        try {
          const p = await getPrice(symbol, market);

          if (typeof p === "number" && !Number.isNaN(p)) {
            livePrice = p;
          } else {
            console.warn(`${market} price invalid for ${symbol}`);
          }
        } catch (e) {
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
