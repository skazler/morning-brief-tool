// ─────────────────────────────────────────────────────────────────────────────
// MORNING BRIEFING — CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  // ── Schedule ───────────────────────────────────────────────────────────────
  schedule: "0 5 * * *",

  // ── Recipient ──────────────────────────────────────────────────────────────
  recipient: {
    name: process.env.RECIPIENT_NAME ?? "Friend",
    email: process.env.RECIPIENT_EMAIL ?? "",
  },

  // ── Email delivery ─────────────────────────────────────────────────────────
  email: {
    from: {
      name: process.env.FROM_NAME ?? "Morning Briefing",
    },
    subject: "☀️ Your Morning Briefing — {date}",
    resend: {
      apiKey: process.env.RESEND_API_KEY ?? "",
      fromAddress: process.env.RESEND_FROM_ADDRESS ?? "onboarding@resend.dev",
    },
  },

  // ── Weather ────────────────────────────────────────────────────────────────
  weather: {
    enabled: true,
    apiKey: process.env.OPENWEATHER_API_KEY ?? "",
    location: process.env.WEATHER_LOCATION ?? "New York",
    units: (process.env.WEATHER_UNITS ?? "imperial") as "imperial" | "metric",
  },

  // ── Hacker News ────────────────────────────────────────────────────────────
  hackerNews: {
    enabled: true,
    pageSize: 5,
    minScore: 50,
    hoursBack: 24,
  },

  // ── The Guardian ───────────────────────────────────────────────────────────
  guardian: {
    enabled: true,
    apiKey: process.env.GUARDIAN_API_KEY ?? "",
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

  // ── Quote of the day ───────────────────────────────────────────────────────
  quote: {
    enabled: true,
  },
} as const;

export type Config = typeof config;
