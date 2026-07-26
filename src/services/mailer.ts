import { Config } from "../config";

interface SendOptions {
  subject: string;
  html: string;
}

// Posts straight to the Resend REST API rather than going through the `resend`
// npm package. The SDK works on Workers, but it's a dependency earning its keep
// on one short request — and this way there's no node_modules surface between us
// and the only outbound call whose failure actually loses the email.
export async function sendEmail(
  cfg: Config,
  { subject, html }: SendOptions
): Promise<void> {
  const { resend, from } = cfg.email;
  const { email: toEmail } = cfg.recipient;

  if (!toEmail) throw new Error("RECIPIENT_EMAIL is not set.");
  if (!resend.apiKey) throw new Error("RESEND_API_KEY is not set.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${resend.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: `${from.name} <${resend.fromAddress}>`,
      to: toEmail,
      subject,
      html,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(
      `Resend error ${response.status}: ${(await response.text()).slice(0, 300)}`
    );
  }

  const { id } = (await response.json()) as { id?: string };
  console.log(`[email] Sent via Resend → ${toEmail} (id ${id ?? "unknown"})`);
}
