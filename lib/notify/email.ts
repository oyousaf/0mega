"use server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");

export async function sendEmail(subject: string, body: string) {
  if (!process.env.RESEND_API_KEY) return;
  if (!process.env.NOTIFY_EMAIL_TO) return;

  try {
    await resend.emails.send({
      from: "Omega <omega@legxcysol.dev>",
      to: process.env.NOTIFY_EMAIL_TO,
      subject,
      html: `<p>${body}</p>`,
    });
  } catch (err) {
    console.error("Email send failed:", err);
  }
}
