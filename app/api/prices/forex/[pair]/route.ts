import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/rateLimitCache";

/** Convert EURUSD → EUR/USD */
function normalizePair(raw: string): string {
  const p = raw.toUpperCase().trim();

  // Correct format? EUR/USD → keep as-is
  if (p.includes("/")) return p;

  // Slashless 6-character FX code
  if (p.length === 6) {
    return `${p.slice(0, 3)}/${p.slice(3)}`;
  }

  return p;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pair: string }> }
) {
  const { pair } = await params;

  const normalized = normalizePair(pair);
  const cacheKey = `forex_${normalized}`;

  // 1. Cached?
  const cached = getCached(cacheKey);
  if (cached) return NextResponse.json({ ...cached, cached: true });

  // -------------------------------
  // PRIMARY: CurrencyAPI
  // -------------------------------
  try {
    const url = `https://api.currencyapi.com/v3/latest?apikey=${
      process.env.CURRENCY_API_KEY
    }&currencies=${normalized.replace("/", "")}`;

    const res = await fetch(url, { cache: "no-store" });

    if (res.ok) {
      const json = await res.json();

      // Convert EUR/USD → EURUSD for CurrencyAPI
      const key = normalized.replace("/", "");

      const price = json?.data?.[key]?.value;

      if (price && !isNaN(price)) {
        const result = {
          source: "currencyapi_spot",
          pair: normalized,
          price: Number(price),
          halaal: true,
          cached: false,
        };

        setCached(cacheKey, result, 2000);
        return NextResponse.json(result);
      }
    }
  } catch (e) {
    console.warn("CurrencyAPI primary failed:", e);
  }

  // -------------------------------
  // FALLBACK: TwelveData
  // -------------------------------
  try {
    const encoded = encodeURIComponent(normalized);
    const url = `https://api.twelvedata.com/price?symbol=${encoded}&apikey=${process.env.TWELVE_DATA_API_KEY}`;

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      throw new Error(`TwelveData API error: ${res.status}`);
    }

    const data = await res.json();

    const price = data?.price ? Number(data.price) : null;

    const result = {
      source: "twelvedata_spot",
      pair: normalized,
      price,
      halaal: true,
      cached: false,
    };

    setCached(cacheKey, result, 2000);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Unknown forex provider error" },
      { status: 500 }
    );
  }
}
