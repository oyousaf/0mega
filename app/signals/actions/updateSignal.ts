"use server";

import { pool } from "@/lib/neon";
import { revalidatePath } from "next/cache";

export async function updateSignal(id: number, data: any) {
  // Basic guard
  if (!id || isNaN(id)) {
    throw new Error("Invalid signal ID");
  }

  // Extract + sanitize
  const {
    symbol = "",
    strategy = "",
    entry_price = "",
    tp1 = "",
    tp2 = "",
    sl = "",
    status = "active",
    type = "stock",
    halaal = true,
  } = data ?? {};

  // Perform update
  const result = await pool.query(
    `UPDATE signals
      SET symbol=$1,
          strategy=$2,
          entry_price=$3,
          tp1=$4,
          tp2=$5,
          sl=$6,
          status=$7,
          type=$8,
          halaal=$9,
          updated_at = NOW()
      WHERE id=$10
      RETURNING *`,
    [symbol, strategy, entry_price, tp1, tp2, sl, status, type, halaal, id]
  );

  if (result.rowCount === 0) {
    throw new Error("Signal not found — failed to update");
  }

  // Revalidate dashboard & pages using these values
  revalidatePath("/signals");
  revalidatePath(`/signals/edit/${id}`);

  return result.rows[0];
}
