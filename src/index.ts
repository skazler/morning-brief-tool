import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import cron from "node-cron";
import { format } from "date-fns";
import { config } from "./config";
import { fetchWeather } from "./services/weather";
import { fetchNewsSections } from "./services/news";
import { fetchQuote } from "./services/quote";
import { renderEmail } from "./template";
import { sendEmail } from "./services/mailer";
import { BriefingData } from "./types";

// ─── Core job ─────────────────────────────────────────────────────────────────

async function runBriefing(): Promise<void> {
  console.log(`\n[briefing] Running at ${new Date().toISOString()}`);

  // Fetch all enabled modules concurrently
  const [weather, newsSections, quote] = await Promise.all([
    config.weather.enabled ? fetchWeather() : Promise.resolve(undefined),
    config.news.enabled ? fetchNewsSections() : Promise.resolve([]),
    config.quote.enabled ? fetchQuote() : Promise.resolve(undefined),
  ]);

  const briefing: BriefingData = {
    recipientName: config.recipient.name,
    date: format(new Date(), "EEEE, MMMM do yyyy"),
    weather: weather ?? undefined,
    newsSections,
    quote: quote ?? undefined,
  };

  const html = renderEmail(briefing);

  const subject = config.email.subject.replace(
    "{date}",
    format(new Date(), "MMMM do")
  );

  await sendEmail({ subject, html });
  console.log("[briefing] Done ✓");
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--now")) {
  // Run immediately (useful for testing)
  runBriefing().catch((err) => {
    console.error("[briefing] Fatal error:", err);
    process.exit(1);
  });
} else {
  // Schedule via cron
  const { schedule } = config;
  if (!cron.validate(schedule)) {
    console.error(`[briefing] Invalid cron expression: "${schedule}"`);
    process.exit(1);
  }

  console.log(`[briefing] Scheduled — cron: "${schedule}"`);
  console.log(`[briefing] Run with --now to trigger immediately.`);

  cron.schedule(schedule, () => {
    runBriefing().catch((err) => console.error("[briefing] Error:", err));
  });
}
