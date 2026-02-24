// ─────────────────────────────────────────────────────────────────────────────
// MORNING BRIEFING — CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  // ── Schedule ───────────────────────────────────────────────────────────────
  // Standard cron syntax: "minute hour * * *"
  // Default: 5:00 AM every day.  Try https://crontab.guru to build your own.
  schedule: "0 5 * * *",

  // ── Recipient ──────────────────────────────────────────────────────────────
  recipient: {
    name: process.env.RECIPIENT_NAME ?? "Friend",
    email: process.env.RECIPIENT_EMAIL ?? "",
  },

  // ── Email delivery ─────────────────────────────────────────────────────────
  email: {
    provider: (process.env.EMAIL_PROVIDER ?? "smtp") as "smtp" | "sendgrid",
    from: {
      name: process.env.FROM_NAME ?? "Morning Briefing",
      email: process.env.FROM_EMAIL ?? "",
    },
    subject: "☀️ Your Morning Briefing — {date}",
    smtp: {
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT ?? "587"),
      secure: process.env.SMTP_SECURE === "true",
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS ?? "",
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY ?? "",
    },
  },

  // ── Weather ────────────────────────────────────────────────────────────────
  weather: {
    enabled: true,
    apiKey: process.env.OPENWEATHER_API_KEY ?? "",
    location: process.env.WEATHER_LOCATION ?? "New York",
    units: (process.env.WEATHER_UNITS ?? "imperial") as "imperial" | "metric",
  },

  // ── The Guardian ───────────────────────────────────────────────────────────
  // Global news with a non-US-centric perspective.
  guardian: {
    enabled: true,
    apiKey: process.env.GUARDIAN_API_KEY ?? "",
    sections: [
      {
        name: "Global Tech News",
        section: "technology",
        query:
          'AI OR semiconductor OR machine learning OR semiconductor OR "big tech"',
        pageSize: 5,
        enabled: true,
      },
      {
        name: "World News",
        section: "world",
        query: "world",
        pageSize: 5,
        enabled: true,
      },
    ],
  },

  // ── Hacker News ────────────────────────────────────────────────────────────
  // Top technical stories from the HN community.
  hackerNews: {
    enabled: true,
    pageSize: 5,
    minScore: 50,
    hoursBack: 24,
  },

  // ── Quote of the day ───────────────────────────────────────────────────────
  quote: {
    enabled: true,
  },
} as const;

export type Config = typeof config;
