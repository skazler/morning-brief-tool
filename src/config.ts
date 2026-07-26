// ─────────────────────────────────────────────────────────────────────────────
// MORNING BRIEFING — CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
//
// On Workers there is no `process.env` — bindings arrive per-invocation on `env`.
// So this is a factory, not a top-level const: call `makeConfig(env)` once at the
// top of a handler and thread the result through. Everything that isn't a secret
// (section lists, page sizes, thresholds) is still hardcoded here — that's the
// one file you edit to change what the email contains.

/** Everything bound to the Worker: `vars` from wrangler.jsonc + `wrangler secret put`. */
export interface Env {
  // ── vars (wrangler.jsonc, not secret) ──
  TIMEZONE: string;
  DAILY_HOUR: string;
  DAILY_MINUTE: string;
  WEATHER_LOCATION?: string;
  WEATHER_UNITS?: string;
  FROM_NAME?: string;
  RECIPIENT_NAME?: string;

  // ── secrets (wrangler secret put) ──
  RECIPIENT_EMAIL?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_ADDRESS?: string;
  OPENWEATHER_API_KEY?: string;
  GUARDIAN_API_KEY?: string;
  /** Channel webhook. Set ⇒ the briefing is also posted to Discord. */
  DISCORD_WEBHOOK_URL?: string;
  /** Guards the manual-trigger HTTP endpoint. Unset ⇒ endpoint refuses all requests. */
  TRIGGER_SECRET?: string;
}

export function makeConfig(env: Env) {
  return {
    // ── Schedule ─────────────────────────────────────────────────────────────
    // Local wall-clock time the brief should arrive. Cloudflare cron is UTC-only,
    // so `triggers.crons` in wrangler.jsonc wakes the Worker at both the CDT and
    // CST candidate hours and `shouldRunNow()` no-ops on the wrong one. Changing
    // the time here means changing that cron expression too.
    schedule: {
      timezone: env.TIMEZONE || "America/Chicago",
      hour: Number(env.DAILY_HOUR ?? 5),
      minute: Number(env.DAILY_MINUTE ?? 0),
    },

    // ── Recipient ────────────────────────────────────────────────────────────
    recipient: {
      name: env.RECIPIENT_NAME || "Friend",
      email: env.RECIPIENT_EMAIL || "",
    },

    // ── Delivery ─────────────────────────────────────────────────────────────
    // Two independent channels. Each turns itself on when its credentials are
    // present, so adding Discord is `wrangler secret put DISCORD_WEBHOOK_URL`
    // and nothing else — and dropping email is deleting its two secrets. A run
    // with no channel configured is an error rather than a silent no-op; see
    // `runBriefing`.
    email: {
      enabled: Boolean(env.RESEND_API_KEY && env.RECIPIENT_EMAIL),
      from: {
        name: env.FROM_NAME || "Morning Briefing",
      },
      subject: "☀️ Your Morning Briefing — {date}",
      resend: {
        apiKey: env.RESEND_API_KEY || "",
        fromAddress: env.RESEND_FROM_ADDRESS || "onboarding@resend.dev",
      },
    },

    discord: {
      enabled: Boolean(env.DISCORD_WEBHOOK_URL),
      webhookUrl: env.DISCORD_WEBHOOK_URL || "",
    },

    // ── Weather ──────────────────────────────────────────────────────────────
    weather: {
      enabled: true,
      apiKey: env.OPENWEATHER_API_KEY || "",
      location: env.WEATHER_LOCATION || "New York",
      units: (env.WEATHER_UNITS || "imperial") as "imperial" | "metric",
    },

    // ── Hacker News ──────────────────────────────────────────────────────────
    hackerNews: {
      enabled: true,
      pageSize: 5,
      minScore: 50,
      hoursBack: 24,
    },

    // ── The Guardian ─────────────────────────────────────────────────────────
    guardian: {
      enabled: true,
      apiKey: env.GUARDIAN_API_KEY || "",
      sections: [
        {
          name: "Global Tech News",
          section: "technology",
          query: "",
          pageSize: 5,
          enabled: true,
        },
        {
          name: "World News",
          section: "world",
          query: "",
          pageSize: 5,
          enabled: true,
        },
      ],
    },

    // ── Quote of the day ─────────────────────────────────────────────────────
    quote: {
      enabled: true,
    },
  };
}

export type Config = ReturnType<typeof makeConfig>;
