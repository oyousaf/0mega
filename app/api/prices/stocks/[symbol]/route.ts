import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/rateLimitCache";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const upper = symbol.toUpperCase();

  const cacheKey = `stocks_${upper}`;

  // 1. Serve cached result if available
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  try {
    const url = `https://api.polygon.io/v2/last/trade/${upper}?apiKey=${process.env.POLYGON_API_KEY}`;

    const res = await fetch(url, { method: "GET", cache: "no-store" });

    if (!res.ok) {
      throw new Error(`Polygon API error: ${res.status}`);
    }

    const data = await res.json();
    const price = data?.results?.p ?? null;

    const result = {
      source: "polygon_spot",
      symbol: upper,
      price,
      halaal: true,
      cached: false,
    };

    // 2. Cache for 2 seconds
    setCached(cacheKey, result, 2000);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
