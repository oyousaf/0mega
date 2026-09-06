import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/rateLimitCache";

type StockPriceResponse = {
  c?: unknown;
  quotes?: Array<{
    price?: unknown;
    last?: { price?: unknown };
  }>;
};

const safe = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : null);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const upper = symbol.toUpperCase();
  const cacheKey = `stock_${upper}`;

  // CACHE
  const cached = getCached<Record<string, unknown>>(cacheKey);
  if (cached) return NextResponse.json({ ...cached, cached: true });

  // 1. Finnhub
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${upper}&token=${process.env.FINNHUB_API_KEY}`;
    const res = await fetch(url, { cache: "no-store" });

    if (res.ok) {
      const j = (await res.json()) as StockPriceResponse;
      const price = safe(j.c);

      if (price) {
        const result = {
          source: "finnhub_spot",
          symbol: upper,
          price,
          halaal: true,
          cached: false,
        };

        setCached(cacheKey, result, 2000);
        return NextResponse.json(result);
      }
    }
  } catch {}

  // 2. Polygon (Massive)
  try {
    const url = `https://api.massive.com/v3/stocks/quotes?symbols=${upper}&apiKey=${process.env.POLYGON_API_KEY}`;

    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const j = (await res.json()) as StockPriceResponse;
      const price =
        safe(j.quotes?.[0]?.last?.price) ??
        safe(j.quotes?.[0]?.price) ??
        null;

      if (price) {
        const result = {
          source: "polygon_spot",
          symbol: upper,
          price,
          halaal: true,
          cached: false,
        };

        setCached(cacheKey, result, 2000);
        return NextResponse.json(result);
      }
    }
  } catch {}

  // Never turn a provider failure into a fabricated market price.
  return NextResponse.json(
    {
      source: "stocks_fallback",
      symbol: upper,
      halaal: true,
      error: "price_unavailable",
    },
    { status: 503 }
  );
}
