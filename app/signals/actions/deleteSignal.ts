"use server";

import { pool } from "@/lib/neon";
import { revalidatePath } from "next/cache";

export async function deleteSignal(id: number) {
  if (!id || isNaN(id)) throw new Error("Invalid ID");

  const result = await pool.query(
    `DELETE FROM signals WHERE id = $1 RETURNING id`,
    [id]
  );

  if (result.rowCount === 0) {
    throw new Error("Signal not found — delete failed");
  }

  revalidatePath("/signals");

  return { success: true };
}
