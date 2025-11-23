import { pool } from "@/lib/neon";
import { getPrice } from "@/providers";
import { formatStatus } from "@/app/utils/formatStatus";

const PRICE_THRESHOLD = 0.05;

function evaluateState(signal: any, price: number) {
  const entry = Number(signal.entry_price);
  const tp1 = Number(signal.tp1);
  const tp2 = Number(signal.tp2);
  const sl = Number(signal.sl);

  if ([entry, tp1, tp2, sl].some((v) => isNaN(v))) return "INVALID";

  if (price >= tp2) return "TP2_HIT";
  if (price >= tp1) return "TP1_HIT";
  if (price <= sl) return "SL_HIT";

  return "ACTIVE";
}

function isExpired(signal: any) {
  const created = new Date(signal.created_at);
  return (Date.now() - created.getTime()) / 86400000 >= 7;
}

async function updateSignalRow(
  id: number,
  prettyStatus: string,
  newPrice: number
) {
  await pool.query(
    `
    UPDATE signals
    SET 
      status = $1,
      current_price = $2,
      updated_at = NOW()
    WHERE id = $3
    `,
    [prettyStatus, newPrice, id]
  );
}

async function logEvent(signalId: number, prettyStatus: string, price: number) {
  try {
    await pool.query(
      `
      INSERT INTO signal_history (signal_id, event, price, timestamp)
      VALUES ($1, $2, $3, NOW())
      `,
      [signalId, prettyStatus, price]
    );
  } catch (err) {
    console.error("Failed to log event:", err);
  }
}

export async function runStatusEngine(signals: any[]) {
  for (const signal of signals) {
    const oldStatus = formatStatus(signal.status);
    const oldPrice = Number(signal.current_price ?? 0);

    const currentPrice = await getPrice(signal.symbol, signal.type);
    let newStatus = evaluateState(signal, currentPrice);

    if (isExpired(signal)) newStatus = "EXPIRED";

    const prettyStatus = formatStatus(newStatus);

    const statusChanged = prettyStatus !== oldStatus;
    const priceChanged = Math.abs(currentPrice - oldPrice) >= PRICE_THRESHOLD;

    if (!statusChanged && !priceChanged) continue;

    await updateSignalRow(signal.id, prettyStatus, currentPrice);

    if (statusChanged) {
      await logEvent(signal.id, prettyStatus, currentPrice);
    }
  }
}
