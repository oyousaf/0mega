"use server";

import { pool } from "@/lib/neon";
import { revalidatePath } from "next/cache";

export async function updateSignal(id: number, data: any) {
  await pool.query(
    `UPDATE signals
     SET symbol=$1, strategy=$2, entry_price=$3, tp1=$4, tp2=$5, sl=$6, status=$7, type=$8, halaal=$9
     WHERE id=$10`,
    [
      data.symbol,
      data.strategy,
      data.entry_price,
      data.tp1,
      data.tp2,
      data.sl,
      data.status,
      data.type,
      data.halaal,
      id,
    ]
  );

  revalidatePath("/signals");
  revalidatePath(`/signals/edit/${id}`);
}
