import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";
import Chance from "chance";

const chance = new Chance();

export async function POST() {
  try {
    // Protect production
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Seeder disabled in production" },
        { status: 401 }
      );
    }

    // Clear previous dummy data
    await pool.query(`DELETE FROM signals`);

    const types = ["stock", "crypto", "forex"];
    const results: any[] = [];

    function createSignal(type: string) {
      const symbol =
        type === "crypto"
          ? chance.pickone(["BTC", "ETH", "SOL", "XRP", "ADA"])
          : type === "forex"
          ? chance.pickone(["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD"])
          : chance.pickone(["AAPL", "TSLA", "NFLX", "AMZN", "META"]);

      const entry = chance.floating({ min: 10, max: 200, fixed: 2 });

      const tp1 = +(entry * (1 + chance.floating({ min: 0.01, max: 0.04 }))).toFixed(2);
      const tp2 = +(entry * (1 + chance.floating({ min: 0.05, max: 0.1 }))).toFixed(2);
      const sl = +(entry * (1 - chance.floating({ min: 0.01, max: 0.04 }))).toFixed(2);

      return {
        symbol,
        strategy: chance.pickone(["Breakout", "Reversal", "Momentum", "Scalp", "News"]),
        entry_price: entry,
        tp1,
        tp2,
        sl,
        status: "ACTIVE",
        type,
        halaal: chance.bool({ likelihood: 90 }),
        current_price: entry,
        notes: chance.sentence({ words: 6 }),
      };
    }

    // Generate 5 signals per type
    for (const type of types) {
      for (let i = 0; i < 5; i++) {
        const sig = createSignal(type);

        const inserted = await pool.query(
          `
          INSERT INTO signals 
          (symbol, strategy, entry_price, tp1, tp2, sl, status, type, halaal, current_price, notes)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          RETURNING *
        `,
          [
            sig.symbol,
            sig.strategy,
            sig.entry_price,
            sig.tp1,
            sig.tp2,
            sig.sl,
            sig.status,
            sig.type,
            sig.halaal,
            sig.current_price,
            sig.notes,
          ]
        );

        results.push(inserted.rows[0]);
      }
    }

    return NextResponse.json({
      ok: true,
      count: results.length,
      signals: results,
    });
  } catch (err: any) {
    console.error("Seed error:", err);
    return NextResponse.json(
      { error: "Seeder failed", detail: err.message },
      { status: 500 }
    );
  }
}
