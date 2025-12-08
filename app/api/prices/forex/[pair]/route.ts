import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/rateLimitCache";

/** Normalise pair */
function normalizePair(raw: string): string {
  const p = raw.toUpperCase().trim();
  if (p.includes("/")) return p;
  if (p.length === 6) return `${p.slice(0, 3)}/${p.slice(3)}`;
  return p;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pair: string }> }
) {
  const { pair } = await params;

  const normalized = normalizePair(pair);
  const [base, quote] = normalized.split("/");
  const cacheKey = `forex_${normalized}`;

  // CACHE
  const cached = getCached(cacheKey);
  if (cached) return NextResponse.json({ ...cached, cached: true });

  // -------------------------------------------------------
  // PRIMARY → Frankfurter
  // -------------------------------------------------------
  try {
    const url = `https://api.frankfurter.app/latest?from=${base}&to=${quote}`;
    const res = await fetch(url, { cache: "no-store" });

    if (res.ok) {
      const json = await res.json();
      const price = json?.rates?.[quote];

      if (price && !isNaN(price)) {
        const result = {
          source: "frankfurter_spot",
          pair: normalized,
          price: Number(price),
          halaal: true,
          cached: false,
        };

        setCached(cacheKey, result, 60_000); // 1 min cache
        return NextResponse.json(result);
      }
    }
  } catch (err) {
    console.warn("Frankfurter primary failed:", err);
  }

  // -------------------------------------------------------
  // FALLBACK → TwelveData (real-time)
  // -------------------------------------------------------
  try {
    const symbol = encodeURIComponent(normalized);
    const url = `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${process.env.TWELVE_DATA_API_KEY}`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`TwelveData HTTP ${res.status}`);

    const data = await res.json();
    const price = data?.price ? Number(data.price) : null;

    if (!price || isNaN(price)) throw new Error("Invalid TwelveData price");

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
    console.error("TwelveData fallback failed:", err);
    return NextResponse.json(
      { error: err.message || "No forex provider available" },
      { status: 500 }
    );
  }
}
