import { NextResponse } from "next/server";
import { getBroker } from "@/providers/execution/router";
import { getPrice } from "@/providers/index";

/* ---------------------------------------------
   MARKET DETECTION
--------------------------------------------- */
function detectMarket(symbol: string): "crypto" | "forex" | "stock" {
  const s = symbol.toUpperCase();

  if (s.endsWith("USD") || s.endsWith("USDT") || s.endsWith("BTC") || s.endsWith("ETH"))
    return "crypto";

  if (/^[A-Z]{6}$/.test(s)) return "forex";

  return "stock";
}

/* ---------------------------------------------
   SAFE HELPERS
--------------------------------------------- */
const n = (v: any): number => {
  const x = Number(v);
  return isFinite(x) ? x : 0;
};

const safeISO = (x: any): string => {
  const d = new Date(x);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

/* ---------------------------------------------
   MAIN ROUTE
--------------------------------------------- */
export async function GET() {
  try {
    const broker = getBroker();

    const rawTrades = await broker.getOpenTrades();
    const balance = n(await broker.getBalance());

    const trades = await Promise.all(
      rawTrades.map(async (t) => {
        const symbol = t.symbol?.toUpperCase() ?? "UNKNOWN";
        const market = detectMarket(symbol);

        const entry = n(t.entryPrice);
        const qty = n(t.qty);

        let livePrice: number | null = null;

        /* -----------------------------------------
           ATTEMPT LIVE PRICE
        ------------------------------------------ */
        try {
          const p = await getPrice(symbol, market);

          if (typeof p === "number" && !Number.isNaN(p)) {
            livePrice = p;
          } else {
            console.warn(`Invalid ${market} price for ${symbol}`);
          }
        } catch {
          console.warn(`Price fetch failed for ${symbol}`);
        }

        /* -----------------------------------------
           FALLBACK ONLY IF PRICE FAILED
        ------------------------------------------ */
        if (livePrice === null) livePrice = entry;

        /* -----------------------------------------
           PNL CALC
        ------------------------------------------ */
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
          opened_at: safeISO(t.openedAt),
          closed_at: null,
          is_closed: false,

          executions: [
            {
              exec_id: `open-${t.id}`,
              price: entry,
              qty,
              side: "OPEN",
              time: safeISO(t.openedAt),
              broker: "paper",
            },
          ],

          halaal: true,
        };
      })
    );

    return NextResponse.json({ success: true, balance, trades });
  } catch (err: any) {
    console.error("Open trades API error:", err);
    return NextResponse.json(
      { success: false, error: err.message || String(err) },
      { status: 500 }
    );
  }
}
