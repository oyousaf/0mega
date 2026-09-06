"use server";

import { Resend } from "resend";

export async function sendEmail(subject: string, body: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.NOTIFY_EMAIL_TO;
  if (!apiKey || !recipient) return;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: "Omega <omega@legxcysol.dev>",
      to: recipient,
      subject,
      html: `<p>${body}</p>`,
    });
  } catch (err) {
    console.error("Email send failed:", err);
  }
}
