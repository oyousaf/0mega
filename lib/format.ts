/* -------------------------------------------------------
FORMAT UTILITIES
------------------------------------------------------- */

function isForex(symbol?: string) {
  if (!symbol) return false;
  return /^[A-Z]{6}$/.test(symbol.toUpperCase());
}

function isCrypto(symbol?: string) {
  if (!symbol) return false;
  const s = symbol.toUpperCase();
  return s.endsWith("USDT") || s.endsWith("BTC") || s.endsWith("ETH");
}

/* -------------------------------------------------------
PRICE FORMATTER
------------------------------------------------------- */

export function fmtPrice(value: unknown, symbol?: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";

  if (isForex(symbol)) return n.toFixed(5);

  if (isCrypto(symbol)) {
    if (n < 1) return n.toFixed(6);
    if (n < 1000) return n.toFixed(2);
    return n.toLocaleString("en-GB", { maximumFractionDigits: 2 });
  }

  if (n < 1000) return n.toFixed(2);

  return n.toLocaleString("en-GB", { maximumFractionDigits: 2 });
}

/* -------------------------------------------------------
QUANTITY FORMATTER
------------------------------------------------------- */

export function fmtQty(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";

  if (n < 1) return n.toFixed(4);

  return n.toLocaleString("en-GB", { maximumFractionDigits: 2 });
}

/* -------------------------------------------------------
PNL FORMATTER
------------------------------------------------------- */

export function fmtPnL(value: unknown, currency = "£") {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";

  return `${currency}${n.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
