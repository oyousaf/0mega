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

    // Clear previous dummy signals
    await pool.query(`DELETE FROM signals`);

    const types = ["stock", "crypto", "forex"];
    const results: any[] = [];

    /* -----------------------------------------------------
       STRATEGY-SPECIFIC NOTES
    ----------------------------------------------------- */
    const strategyNotes: Record<string, string[]> = {
      Breakout: [
        "Watching for continuation above resistance.",
        "Breakout clean; looking for follow-through.",
        "Holding structure; breakout remains valid.",
        "Strong move; monitoring next resistance.",
        "Retest forming; waiting for confirmation.",
      ],
      Reversal: [
        "Reversal forming; watching candle structure.",
        "Momentum slowing; early reversal signs.",
        "Price rejecting key level repeatedly.",
        "Structure weakening; reversal possible.",
        "Monitoring volume shift for confirmation.",
      ],
      Momentum: [
        "Momentum strong; trend intact.",
        "Clean impulse; watching next push.",
        "Momentum stable; TP1 likely soon.",
        "Strong leg up; tracking trendline.",
        "Pullback shallow; momentum healthy.",
      ],
      Scalp: [
        "Quick scalp setup forming.",
        "Watching micro-structure closely.",
        "Fast reaction needed; monitoring level.",
        "Small range; waiting for trigger.",
        "Tight structure; potential quick move.",
      ],
      News: [
        "News volatility expected; careful timing.",
        "Sharp movement possible; watching feed.",
        "Event incoming; monitoring reaction.",
        "Market unstable; waiting for clarity.",
        "News spike likely; careful entry needed.",
      ],
    };

    /* -----------------------------------------------------
       Generate a single signal
    ----------------------------------------------------- */
    function createSignal(type: string) {
      const symbol =
        type === "crypto"
          ? chance.pickone(["BTC", "ETH", "SOL", "XRP", "ADA"])
          : type === "forex"
          ? chance.pickone(["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD"])
          : chance.pickone(["AAPL", "TSLA", "NFLX", "AMZN", "META"]);

      const entry = chance.floating({ min: 10, max: 200, fixed: 2 });

      const tp1 = +(
        entry *
        (1 + chance.floating({ min: 0.01, max: 0.04 }))
      ).toFixed(2);

      const tp2 = +(
        entry *
        (1 + chance.floating({ min: 0.05, max: 0.1 }))
      ).toFixed(2);

      const sl = +(
        entry *
        (1 - chance.floating({ min: 0.01, max: 0.04 }))
      ).toFixed(2);

      const current_price = +(
        entry *
        (1 + chance.floating({ min: -0.03, max: 0.05 }))
      ).toFixed(2);

      const strategy = chance.pickone([
        "Breakout",
        "Reversal",
        "Momentum",
        "Scalp",
        "News",
      ]);

      const notes = chance.pickone(strategyNotes[strategy]);

      return {
        symbol,
        strategy,
        entry_price: entry,
        tp1,
        tp2,
        sl,
        status: "ACTIVE",
        type,
        halaal: chance.bool({ likelihood: 90 }),
        current_price,
        notes,
      };
    }

    /* -----------------------------------------------------
       Generate 5 per type
    ----------------------------------------------------- */
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
