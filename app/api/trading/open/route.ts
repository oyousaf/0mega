import { NextResponse } from "next/server";
import { getBroker } from "@/providers/execution/router";
import { getPrice } from "@/providers/index";

/* -------------------------------------------------------
   MARKET DETECTOR
   Crypto = symbol ends with "USD" or "USDT" etc.
   Forex  = 6-char pairs like GBPUSD, EURJPY, etc.
   Stock  = Fallback
------------------------------------------------------- */
function detectMarket(symbol: string): "crypto" | "forex" | "stock" {
  const upper = symbol.toUpperCase();

  // Forex: 6-letter pairs, e.g., GBPUSD, EURJPY, AUDCAD
  if (/^[A-Z]{6}$/.test(upper)) return "forex";

  // Crypto: ends with USD, USDT, BTC, ETH etc
  if (
    upper.endsWith("USD") ||
    upper.endsWith("USDT") ||
    upper.endsWith("BTC") ||
    upper.endsWith("ETH")
  )
    return "crypto";

  return "stock";
}

export async function GET() {
  try {
    const broker = getBroker();

    // Provider open positions
    const rawTrades = await broker.getOpenTrades();
    const balance = await broker.getBalance();

    const trades = await Promise.all(
      rawTrades.map(async (t) => {
        const openedAt = t.openedAt
          ? new Date(t.openedAt).toISOString()
          : new Date().toISOString();

        // DETECT MARKET
        const market = detectMarket(t.symbol);

        // SAFE PRICE FETCHING
        let livePrice: number = t.entryPrice; // fallback

        try {
          const p = await getPrice(t.symbol, market);
          if (typeof p === "number" && !Number.isNaN(p)) {
            livePrice = p;
          }
        } catch {
          console.warn(`Price fetch failed for ${t.symbol}, using entry price`);
        }

        // Unrealised P/L
        const pnl =
          t.side === "BUY"
            ? (livePrice - t.entryPrice) * t.qty
            : (t.entryPrice - livePrice) * t.qty;

        return {
          trade_id: String(t.id),
          symbol: t.symbol,

          side: t.side === "BUY" ? "LONG" : "SHORT",
          strategy: "Unknown",

          entry_price: t.entryPrice,
          entry_fill_price: t.entryPrice,

          exit_fill_price: null,
          realised_pl: pnl,
          rr: null,

          qty: t.qty,
          opened_at: openedAt,
          closed_at: null,
          is_closed: false,

          executions: [
            {
              exec_id: `open-${t.id}`,
              price: t.entryPrice,
              qty: t.qty,
              side: "OPEN",
              time: openedAt,
              broker: broker.name ?? "paper",
            },
          ],
        };
      })
    );

    return NextResponse.json({ trades, balance });
  } catch (err: any) {
    console.error("Open trades API error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
