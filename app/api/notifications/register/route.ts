import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // TODO: Save subscription to Neon DB if needed:
    // await pool.query("INSERT INTO push_subs (endpoint, p256dh, auth) VALUES ($1,$2,$3)", 
    //   [body.endpoint, body.keys.p256dh, body.keys.auth]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Register push error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
