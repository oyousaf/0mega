"use server";

import webpush from "web-push";
import { pool } from "@/lib/db";

export async function sendPushNotification(title: string, body: string) {
  const subject = process.env.VAPID_PUBLIC_EMAIL?.trim();
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!subject || !publicKey || !privateKey) return;

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    const { rows: subs } = await pool.query(`SELECT id, sub FROM push_subs`);
    const payload = JSON.stringify({ title, body });

    for (const row of subs) {
      try {
        await webpush.sendNotification(row.sub, payload);
      } catch {
        await pool.query(`DELETE FROM push_subs WHERE id = $1`, [row.id]);
      }
    }
  } catch (err) {
    console.error("Push send failure:", err);
  }
}
