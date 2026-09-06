import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

type PushSubscriptionBody = {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PushSubscriptionBody;
    if (
      typeof body.endpoint !== "string" ||
      typeof body.keys?.p256dh !== "string" ||
      typeof body.keys.auth !== "string"
    ) {
      return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
    }

    await pool.query(
      `
      INSERT INTO push_subs (sub)
      VALUES ($1::jsonb)
      ON CONFLICT ((sub->>'endpoint'))
      DO UPDATE SET sub = EXCLUDED.sub
      `,
      [JSON.stringify(body)],
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Register push error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
