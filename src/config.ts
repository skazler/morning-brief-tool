import dotenv from "dotenv";
dotenv.config();

// ─────────────────────────────────────────────────────────────────────────────
// MORNING BRIEFING — CONFIGURATION
// Edit this file to customise exactly what lands in your inbox each morning.
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  // ── Schedule ───────────────────────────────────────────────────────────────
  // Standard cron syntax: "minute hour * * *"
  // Default: 7:00 AM every day.  Try https://crontab.guru to build your own.
  schedule: "0 7 * * *",

  // ── Recipient ──────────────────────────────────────────────────────────────
  recipient: {
    name: process.env.RECIPIENT_NAME ?? "Friend",
    email: process.env.RECIPIENT_EMAIL ?? "",
  },

  // ── Email delivery ─────────────────────────────────────────────────────────
  // Choose ONE provider by setting EMAIL_PROVIDER in your .env:
  //   "smtp"     → Gmail / Outlook / any SMTP server
  //   "sendgrid" → SendGrid API
  email: {
    provider: (process.env.EMAIL_PROVIDER ?? "smtp") as "smtp" | "sendgrid",
    from: {
      name: process.env.FROM_NAME ?? "Morning Briefing",
      email: process.env.FROM_EMAIL ?? "",
    },
    subject: "☀️ Your Morning Briefing — {date}",

    // SMTP settings (used when provider = "smtp")
    smtp: {
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT ?? "587"),
      secure: process.env.SMTP_SECURE === "true", // true = port 465
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS ?? "", // Gmail: use an App Password
    },

    // SendGrid (used when provider = "sendgrid")
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY ?? "",
    },
  },

  // ── Modules ────────────────────────────────────────────────────────────────
  // Set `enabled: true/false` to turn each section on or off.

  weather: {
    enabled: true,
    // Free API key from https://openweathermap.org/api
    apiKey: process.env.OPENWEATHER_API_KEY ?? "",
    // City name, or "lat,lon" e.g. "37.7749,-122.4194"
    location: process.env.WEATHER_LOCATION ?? "New York",
    units: (process.env.WEATHER_UNITS ?? "imperial") as "imperial" | "metric",
  },

  news: {
    enabled: true,
    // Free key from https://newsapi.org  (100 req/day on free tier)
    apiKey: process.env.NEWS_API_KEY ?? "",

    // ── Top headlines ───────────────────────────────────────────────────────
    topHeadlines: {
      enabled: true,
      country: "us", // us, gb, au, ca, de, fr, in, jp, …
      pageSize: 5, // number of stories to include
    },

    // ── Category feeds ─────────────────────────────────────────────────────
    // Add/remove objects to add/remove category sections.
    // Valid categories: business | entertainment | health | science | sports | technology
    categories: [
      {
        name: "Technology",
        category: "technology",
        pageSize: 3,
        enabled: true,
      },
      { name: "Business", category: "business", pageSize: 3, enabled: true },
      { name: "Science", category: "science", pageSize: 3, enabled: false },
      { name: "Health", category: "health", pageSize: 3, enabled: false },
    ],

    // ── Keyword searches ───────────────────────────────────────────────────
    // Arbitrary search terms — great for tracking a specific company, topic, etc.
    searches: [
      // { name: "AI News",  query: "artificial intelligence", pageSize: 3, enabled: true },
      // { name: "Your Stock", query: "NVDA",                 pageSize: 3, enabled: true },
    ] as Array<{
      name: string;
      query: string;
      pageSize: number;
      enabled: boolean;
    }>,
  },

  // ── Quote of the day ───────────────────────────────────────────────────────
  quote: {
    enabled: true,
    // Uses the free https://zenquotes.io API — no key needed
  },
} as const;

export type Config = typeof config;
