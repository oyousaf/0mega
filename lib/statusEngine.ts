import { pool } from "@/lib/neon";
import { fetchMockPrice } from "@/lib/prices";
import { logEvent } from "@/app/signals/actions/logEvent";

/** Convert engine status → UI friendly status */
function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

/** Determine trading state */
export function evaluateState(signal: any, price: number) {
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

/** Expiry rule: after 7 days */
export function isExpired(signal: any) {
  const created = new Date(signal.created_at);
  const now = new Date();
  return (now.getTime() - created.getTime()) / 86400000 >= 7;
}

/** Update signal in DB */
async function updateSignalRow(id: number, status: string, price: number) {
  await pool.query(
    `
    UPDATE signals
    SET status=$1, current_price=$2, updated_at=NOW()
    WHERE id=$3
    `,
    [formatStatus(status), price, id]
  );
}

/** Main engine */
export async function runStatusEngine(signals: any[]) {
  for (const signal of signals) {
    const price = await fetchMockPrice(signal.symbol);
    let newStatus = evaluateState(signal, price);

    if (isExpired(signal)) newStatus = "EXPIRED";

    const pretty = formatStatus(newStatus);

    if (pretty !== signal.status) {
      await updateSignalRow(signal.id, newStatus, price);
      await logEvent(signal.id, pretty.toLowerCase(), price);
    }
  }
}
