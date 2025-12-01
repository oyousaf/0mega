function normalizeBinanceSymbol(raw: string): string {
  if (!raw) return "";

  const s = raw.toUpperCase().trim();

  // If already valid pair (e.g., BTCUSDT) → return as-is
  if (s.endsWith("USDT")) return s;

  // If user enters just the base token (BTC, ETH, SOL, XRP...)
  if (s.length <= 5) {
    return `${s}USDT`;
  }

  // Last resort fallback
  return s;
}

export async function getCryptoPrice(symbol: string): Promise<number> {
  const normalized = normalizeBinanceSymbol(symbol);

  try {
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/prices/crypto/${normalized}`;

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      throw new Error(`Failed to fetch crypto price for ${normalized}`);
    }

    const data = await res.json();

    if (data?.price == null || Number.isNaN(Number(data.price))) {
      throw new Error(`No valid price returned for ${normalized}`);
    }

    return Number(data.price);
  } catch (err) {
    console.error("getCryptoPrice error:", err);
    throw err;
  }
}
