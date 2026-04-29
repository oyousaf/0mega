import { startPriceLoop } from "@/lib/engine/priceLoop";
import { pool } from "@/lib/neon";

declare global {
  var __OMEGA_BOOTED__: boolean | undefined;
}

export async function register() {
  if (globalThis.__OMEGA_BOOTED__) return;
  globalThis.__OMEGA_BOOTED__ = true;

  try {
    const { rows } = await pool.query(`
      SELECT enabled
      FROM automation_state
      LIMIT 1
    `);

    const enabled = Boolean(rows[0]?.enabled);

    if (!enabled) {
      console.log("[ENGINE_BOOT] automation disabled");
      return;
    }

    console.log("[ENGINE_BOOT] starting engine on server boot");

    void startPriceLoop().catch((err) => {
      console.error("[ENGINE_BOOT_FAILED]", err);
    });
  } catch (err) {
    console.error("[ENGINE_BOOT_ERROR]", err);
  }
}
