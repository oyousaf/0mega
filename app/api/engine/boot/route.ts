import { pool } from "@/lib/neon";
import { startPriceLoop } from "@/lib/engine/priceLoop";

declare global {
  var __OMEGA_BOOTED__: boolean | undefined;
}

export async function GET() {
  if (globalThis.__OMEGA_BOOTED__) {
    return Response.json({ ok: true, message: "already booted" });
  }

  const { rows } = await pool.query(
    `SELECT enabled FROM automation_state LIMIT 1`,
  );

  const enabled = Boolean(rows[0]?.enabled);

  if (!enabled) {
    return Response.json({ ok: true, started: false });
  }

  globalThis.__OMEGA_BOOTED__ = true;

  console.log("[ENGINE_BOOT] starting engine via boot route");

  void startPriceLoop().catch((err) => {
    console.error("[ENGINE_BOOT_FAILED]", err);
  });

  return Response.json({ ok: true, started: true });
}
