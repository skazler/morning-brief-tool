import { Env, Config, makeConfig } from "./config";
import { fetchWeather } from "./services/weather";
import { fetchHackerNews } from "./services/hackernews";
import { fetchGuardianSections } from "./services/guardian";
import { fetchQuote } from "./services/quote";
import { sendEmail } from "./services/mailer";
import { sendDiscord } from "./services/discord";
import { renderEmail } from "./template";
import { formatLongDate, formatShortDate, shouldRunNow } from "./time";
import { BriefingData } from "./types";

// ─── Core job ─────────────────────────────────────────────────────────────────

/**
 * Gather every source and render the email. Each fetcher swallows its own errors
 * and resolves to null/[], so one dead upstream costs you that section and not
 * the whole brief — `Promise.all` never sees a rejection.
 */
async function buildBriefing(
  cfg: Config
): Promise<{ subject: string; html: string; briefing: BriefingData }> {
  const now = new Date();
  const { timezone } = cfg.schedule;

  const [weather, hackerNews, guardianSections, quote] = await Promise.all([
    cfg.weather.enabled ? fetchWeather(cfg) : Promise.resolve(null),
    cfg.hackerNews.enabled ? fetchHackerNews(cfg) : Promise.resolve(null),
    cfg.guardian.enabled ? fetchGuardianSections(cfg) : Promise.resolve([]),
    cfg.quote.enabled ? fetchQuote() : Promise.resolve(null),
  ]);

  // Order: Guardian world → Guardian tech → Hacker News
  const newsSections = [
    ...guardianSections,
    ...(hackerNews ? [hackerNews] : []),
  ];

  const briefing: BriefingData = {
    recipientName: cfg.recipient.name,
    date: formatLongDate(now, timezone),
    weather: weather ?? undefined,
    newsSections,
    quote: quote ?? undefined,
  };

  return {
    subject: cfg.email.subject.replace(
      "{date}",
      formatShortDate(now, timezone)
    ),
    html: renderEmail(briefing),
    briefing,
  };
}

/**
 * Deliver to every configured channel.
 *
 * `allSettled` rather than `all`: email and Discord have no reason to share a
 * fate, and a Resend outage shouldn't cost the Discord post. The run still
 * throws when *every* channel failed, so a total outage marks the cron
 * invocation failed and shows up in observability instead of logging quietly.
 */
async function runBriefing(cfg: Config): Promise<void> {
  console.log(`[briefing] Running at ${new Date().toISOString()}`);

  const { subject, html, briefing } = await buildBriefing(cfg);

  const channels: { name: string; send: () => Promise<void> }[] = [];
  if (cfg.email.enabled) {
    channels.push({ name: "email", send: () => sendEmail(cfg, { subject, html }) });
  }
  if (cfg.discord.enabled) {
    channels.push({ name: "discord", send: () => sendDiscord(cfg, briefing) });
  }

  if (channels.length === 0) {
    throw new Error(
      "No delivery channel configured — set RESEND_API_KEY + RECIPIENT_EMAIL, " +
        "or DISCORD_WEBHOOK_URL, or both."
    );
  }

  const results = await Promise.allSettled(channels.map((c) => c.send()));

  const failures = results.flatMap((result, i) =>
    result.status === "rejected"
      ? [`${channels[i].name}: ${result.reason?.message ?? result.reason}`]
      : []
  );

  for (const failure of failures) {
    console.error(`[briefing] Delivery failed — ${failure}`);
  }

  if (failures.length === channels.length) {
    throw new Error(`All delivery channels failed — ${failures.join(" · ")}`);
  }

  console.log(
    `[briefing] Done ✓ (${channels.length - failures.length}/${channels.length} delivered)`
  );
}

// ─── Manual-trigger auth ──────────────────────────────────────────────────────

/** Length-independent compare, so a wrong key can't be narrowed by timing. */
function secretMatches(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

// ─── Worker handlers ──────────────────────────────────────────────────────────

export default {
  /**
   * Cron entry point. wrangler.jsonc registers two firings a day — one for CDT,
   * one for CST — and this drops the one that isn't the configured local time.
   * See `shouldRunNow` for why the match is a window rather than an equality.
   */
  async scheduled(_controller, env: Env, _ctx): Promise<void> {
    const cfg = makeConfig(env);
    const now = new Date();

    if (!shouldRunNow(now, cfg.schedule)) {
      console.log(
        `[briefing] Skipping — ${now.toISOString()} is not ` +
          `${cfg.schedule.hour}:${String(cfg.schedule.minute).padStart(2, "0")} ` +
          `in ${cfg.schedule.timezone} (DST twin firing).`
      );
      return;
    }

    // Thrown errors mark the cron invocation as failed, which is what surfaces it
    // in observability and `wrangler tail`. Don't swallow.
    await runBriefing(cfg);
  },

  /**
   * Manual trigger, replacing the old `node dist/index.js --now`.
   *
   *   POST /run      send the brief now
   *   GET  /preview  render and return the HTML without sending
   *
   * Both require the TRIGGER_SECRET, by `Authorization: Bearer …` or `?key=`.
   * Prefer the header — query strings are recorded in request logs.
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const cfg = makeConfig(env);
    const url = new URL(request.url);

    if (!env.TRIGGER_SECRET) {
      return new Response("Manual trigger disabled: TRIGGER_SECRET is unset.\n", {
        status: 503,
      });
    }

    const provided =
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
      url.searchParams.get("key") ??
      "";

    if (!secretMatches(provided, env.TRIGGER_SECRET)) {
      return new Response("Forbidden\n", { status: 403 });
    }

    try {
      if (url.pathname === "/preview") {
        const { html } = await buildBriefing(cfg);
        return new Response(html, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

      if (url.pathname === "/run" && request.method === "POST") {
        await runBriefing(cfg);
        return new Response("Sent ✓\n");
      }
    } catch (err: any) {
      console.error("[briefing] Manual trigger failed:", err);
      return new Response(`Failed: ${err.message}\n`, { status: 500 });
    }

    return new Response("POST /run · GET /preview\n", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
