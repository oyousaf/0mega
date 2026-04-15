import { pool } from "@/lib/neon";
import { startPriceLoop } from "@/lib/engine/priceLoop";

let started = false;

export async function GET() {
  if (started) {
    return Response.json({ ok: true, message: "already started" });
  }

  const { rows } = await pool.query(
    `SELECT enabled FROM automation_state LIMIT 1`,
  );

  const enabled = rows[0]?.enabled;

  if (enabled) {
    started = true;
    await startPriceLoop();

    return Response.json({ ok: true, started: true });
  }

  return Response.json({ ok: true, started: false });
}
