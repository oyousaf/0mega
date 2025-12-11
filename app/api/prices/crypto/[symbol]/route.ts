import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/rateLimitCache";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;

  let pair = symbol.toUpperCase().replace("/", "");
  const cacheKey = `crypto_${pair}`;

  // CACHE FIRST
  const cached = getCached(cacheKey);
  if (cached) return NextResponse.json({ ...cached, cached: true });

  // Symbol normalisation
  const attempts = [pair];

  // BTCUSD → try BTCUSDT
  if (pair.endsWith("USD") && !pair.endsWith("USDT")) {
    attempts.push(pair.replace("USD", "USDT"));
  }

  // BTCUSDT → try BTCUSD
  if (pair.endsWith("USDT")) {
    attempts.push(pair.replace("USDT", "USD"));
  }

  for (const s of attempts) {
    try {
      const url = `https://api.binance.com/api/v3/ticker/price?symbol=${s}`;
      const res = await fetch(url, { cache: "no-store" });

      if (!res.ok) continue;

      const json = await res.json();
      const price = Number(json.price);

      if (!Number.isFinite(price)) continue;

      const result = {
        source: "binance_spot",
        symbol: json.symbol,
        price,
        halaal: true,
        cached: false,
      };

      setCached(cacheKey, result, 2000);
      return NextResponse.json(result);
    } catch {}
  }

  // FINAL FALLBACK (never break UI)
  return NextResponse.json(
    {
      source: "crypto_fallback",
      symbol: pair,
      price: 0,
      halaal: true,
      fallback: true,
    },
    { status: 200 }
  );
}
