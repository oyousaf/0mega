import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/rateLimitCache";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const upper = symbol.toUpperCase();

  const cacheKey = `stocks_${upper}`;

  // 1. Check cache first
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  // -------------------------------
  // PRIMARY PROVIDER → FINNHUB
  // -------------------------------
  try {
    const finnhubUrl = `https://finnhub.io/api/v1/quote?symbol=${upper}&token=${process.env.FINNHUB_API_KEY}`;

    const response = await fetch(finnhubUrl, { cache: "no-store" });

    if (response.ok) {
      const data = await response.json();

      const price = data?.c;

      if (price && typeof price === "number") {
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
  } catch (err) {
    console.warn("Finnhub primary failed:", err);
  }

  // -------------------------------
  // FALLBACK PROVIDER → MASSIVE (Polygon v3)
  // -------------------------------
  try {
    const massiveUrl = `https://api.massive.com/v3/stocks/quotes?symbols=${upper}&apiKey=${process.env.POLYGON_API_KEY}`;

    const response = await fetch(massiveUrl, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Massive API error: ${response.status}`);
    }

    const data = await response.json();

    // Massive v3 structure → data.quotes[0].last.price
    const price =
      data?.quotes?.[0]?.last?.price ?? data?.quotes?.[0]?.price ?? null;

    const result = {
      source: "massive_spot",
      symbol: upper,
      price,
      halaal: true,
      cached: false,
    };

    setCached(cacheKey, result, 2000);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
