import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";
import { config } from "../config";

interface SendOptions {
  subject: string;
  html: string;
}

export async function sendEmail({ subject, html }: SendOptions): Promise<void> {
  const { provider, from, smtp, sendgrid } = config.email;
  const { email: toEmail, name: toName } = config.recipient;

  if (!toEmail) throw new Error("RECIPIENT_EMAIL is not set.");
  if (!from.email) throw new Error("FROM_EMAIL is not set.");

  if (provider === "sendgrid") {
    if (!sendgrid.apiKey) throw new Error("SENDGRID_API_KEY is not set.");

    sgMail.setApiKey(sendgrid.apiKey);
    await sgMail.send({
      to: { name: toName, email: toEmail },
      from: { name: from.name, email: from.email },
      subject,
      html,
    });
    console.log("[email] Sent via SendGrid →", toEmail);
    return;
  }

  // SMTP
  if (!smtp.user || !smtp.pass)
    throw new Error("SMTP_USER / SMTP_PASS not set.");

  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  await transport.sendMail({
    from: `"${from.name}" <${from.email}>`,
    to: `"${toName}" <${toEmail}>`,
    subject,
    html,
  });

  console.log("[email] Sent via SMTP →", toEmail);
}
