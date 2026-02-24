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

  // ── Hacker News ────────────────────────────────────────────────────────────
  // Top technical stories from the HN community.
  hackerNews: {
    enabled: true,
    pageSize: 5,
    // Only include stories with at least this many upvotes
    minScore: 100,
  },

  // ── The Guardian ───────────────────────────────────────────────────────────
  // Global news with a non-US-centric perspective.
  guardian: {
    enabled: true,
    apiKey: process.env.GUARDIAN_API_KEY ?? "",
    sections: [
      {
        name: "Global Tech News",
        query: "technology",
        pageSize: 5,
        enabled: true,
      },
      {
        name: "World News",
        query: "world",
        pageSize: 5,
        enabled: true,
      },
    ],
  },

  // ── NewsAPI ────────────────────────────────────────────────────────────────
  // Keyword searches work well for targeted topics.
  news: {
    enabled: true,
    apiKey: process.env.NEWS_API_KEY ?? "",

    topHeadlines: {
      enabled: false, // Guardian covers world news better
      country: "us",
      pageSize: 5,
    },

    categories: [
      {
        name: "Technology",
        category: "technology",
        pageSize: 3,
        enabled: false,
      },
      { name: "Business", category: "business", pageSize: 3, enabled: false },
      { name: "Science", category: "science", pageSize: 3, enabled: false },
      { name: "Health", category: "health", pageSize: 3, enabled: false },
    ],

    // ── Curated keyword searches ───────────────────────────────────────────
    // These are targeted and sourced from technical publications.
    searches: [
      {
        name: "AI & Machine Learning",
        query:
          "artificial intelligence OR machine learning OR LLM OR foundation model",
        pageSize: 5,
        enabled: false,
      },
      {
        name: "Semiconductors",
        query: "semiconductor OR TSMC OR NVIDIA OR chip manufacturing OR EUV",
        pageSize: 5,
        enabled: false,
      },
      {
        name: "Tech Industry",
        query: "site:arstechnica.com OR site:theverge.com OR site:wired.com",
        pageSize: 5,
        enabled: false,
      },
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
  },
} as const;

export type Config = typeof config;
