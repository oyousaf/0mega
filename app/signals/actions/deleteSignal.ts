"use server";

import { pool } from "@/lib/neon";
import { revalidatePath } from "next/cache";

export async function deleteSignal(id: number) {
  await pool.query(`DELETE FROM signals WHERE id = $1`, [id]);

  revalidatePath("/signals");
}
