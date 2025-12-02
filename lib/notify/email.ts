import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(subject: string, body: string) {
  if (!process.env.NOTIFY_EMAIL_TO) return;

  await resend.emails.send({
    from: "Omega <noreply@omega.app>",
    to: process.env.NOTIFY_EMAIL_TO,
    subject,
    html: `<p>${body}</p>`,
  });
}
