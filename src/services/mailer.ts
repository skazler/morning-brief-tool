import { Resend } from "resend";
import { config } from "../config";

interface SendOptions {
  subject: string;
  html: string;
}

export async function sendEmail({ subject, html }: SendOptions): Promise<void> {
  const { resend, from } = config.email;
  const { email: toEmail } = config.recipient;

  if (!toEmail) throw new Error("RECIPIENT_EMAIL is not set.");
  if (!resend.apiKey) throw new Error("RESEND_API_KEY is not set.");

  const client = new Resend(resend.apiKey);
  const { error } = await client.emails.send({
    from: `${from.name} <${resend.fromAddress}>`,
    to: toEmail,
    subject,
    html,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
  console.log("[email] Sent via Resend →", toEmail);
}
