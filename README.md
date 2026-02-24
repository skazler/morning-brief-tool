# ☀️ Morning Briefing

A self-hosted, fully configurable daily email digest. Every morning it fetches weather, tech news, and a quote — then delivers a clean HTML email to your inbox.

Built with **TypeScript + Node.js**.

---

## Features

- 🌤 **Weather** — current conditions for any city (OpenWeatherMap)
- 📰 **Hacker News** — top technical stories, filtered by score (no key needed)
- 🌍 **The Guardian** — global news with a non-US perspective
- 🔍 **NewsAPI searches** — targeted keyword feeds (AI, semiconductors, etc.)
- ✨ **Quote of the Day** — no API key needed (zenquotes.io)
- 📬 **Dual email delivery** — SMTP (Gmail, Outlook, etc.) or SendGrid
- ⏰ **Cron scheduling** — any schedule you like, runs as a persistent process

![Email preview](public/emailBrief.png)

---

## Prerequisites

- Node.js 18+
- A free [OpenWeatherMap](https://openweathermap.org/api) API key
- A free [The Guardian](https://open-platform.theguardian.com/access/) API key
- A free [NewsAPI](https://newsapi.org/register) API key (optional)
- An email account to send from (Gmail recommended, or a SendGrid account)

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# → open .env and fill in your keys and credentials

# 3. Build
npm run build

# 4. Send a test briefing right now
node dist/index.js --now

# 5. Start the scheduler
node dist/index.js
```

---

## Configuration

All content and scheduling options live in **`src/config.ts`**. API keys and credentials live in **`.env`**. You should only ever need to touch those two files.

### Schedule

Uses standard cron syntax. Default is 5:00 AM CT daily.

```ts
schedule: "0 11 * * *",     // 5 AM CT (UTC-6) every day
```

→ Use [crontab.guru](https://crontab.guru) to build your expression.

### Weather

```ts
weather: {
  enabled: true,
  location: "Austin",    // city name, or "lat,lon" e.g. "30.2672,-97.7431"
  units: "imperial",     // "imperial" (°F, mph) or "metric" (°C, m/s)
}
```

### Hacker News

```ts
hackerNews: {
  enabled: true,
  pageSize: 5,
  minScore: 100,    // only stories with at least this many upvotes
}
```

### The Guardian

```ts
guardian: {
  enabled: true,
  sections: [
    { name: "Global Tech News", query: "technology", pageSize: 5, enabled: true },
    { name: "World News",       query: "world",      pageSize: 5, enabled: true },
  ],
}
```

### NewsAPI — Keyword Searches

```ts
searches: [
  { name: "AI & Machine Learning", query: "artificial intelligence OR LLM", pageSize: 5, enabled: true },
  { name: "Semiconductors",        query: "semiconductor OR TSMC OR NVIDIA", pageSize: 5, enabled: true },
]
```

### Quote of the Day

```ts
quote: {
  enabled: true,   // set false to remove the section entirely
}
```

---

## Email setup

Set `EMAIL_PROVIDER` in `.env` to either `smtp` or `sendgrid`.

### Gmail (SMTP)

Gmail requires an **App Password** — it won't accept your regular password.

1. Enable 2-Factor Auth on your Google account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Create an App Password for "Mail"
4. Use your Gmail address as `SMTP_USER` and the generated password as `SMTP_PASS`

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx
```

### SendGrid

```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxx
```

Make sure your `FROM_EMAIL` is a verified sender in your SendGrid account.

---

## Running in production

### PM2 (recommended)

```bash
npm install -g pm2
npm run build
pm2 start dist/index.js --name morning-briefing
pm2 save
pm2 startup
```

Useful commands:

```bash
pm2 logs morning-briefing     # tail logs
pm2 restart morning-briefing  # restart after config changes
pm2 stop morning-briefing
```

### systemd (Linux)

Create `/etc/systemd/system/morning-briefing.service`:

```ini
[Unit]
Description=Morning Briefing
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/morning-briefing
ExecStart=/usr/bin/node dist/index.js
EnvironmentFile=/path/to/morning-briefing/.env
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable morning-briefing
sudo systemctl start morning-briefing
sudo journalctl -u morning-briefing -f   # tail logs
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["node", "dist/index.js"]
```

```bash
docker build -t morning-briefing .
docker run -d --env-file .env --name morning-briefing morning-briefing
```

---

## Project structure

```
morning-briefing/
├── public/
│   └── emailBriefPeek.png  ← email preview image
├── src/
│   ├── services/
│   │   ├── guardian.ts     ← The Guardian API fetcher
│   │   ├── hackernews.ts   ← Hacker News fetcher (no key needed)
│   │   ├── mailer.ts       ← SMTP + SendGrid sender
│   │   ├── news.ts         ← NewsAPI fetcher
│   │   ├── quote.ts        ← ZenQuotes fetcher
│   │   └── weather.ts      ← OpenWeatherMap fetcher
│   ├── config.ts           ← All user-facing settings (start here)
│   ├── index.ts            ← Entry point + cron scheduler
│   ├── template.ts         ← HTML email renderer
│   └── types.ts            ← Shared TypeScript types
├── .env.example            ← Copy to .env and fill in your keys
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## API key summary

| Service | Used for | Free tier | Link |
|---|---|---|---|
| OpenWeatherMap | Weather | ✅ 1,000 calls/day | [openweathermap.org/api](https://openweathermap.org/api) |
| The Guardian | Global news | ✅ 500 calls/day | [open-platform.theguardian.com](https://open-platform.theguardian.com/access/) |
| Hacker News | Tech stories | ✅ No key needed | automatic |
| NewsAPI | Keyword searches | ✅ 100 calls/day | [newsapi.org/register](https://newsapi.org/register) |
| ZenQuotes | Quote of the day | ✅ No key needed | automatic |

---

## Troubleshooting

**Email not sending** — Gmail: use an App Password, not your account password. SendGrid: verify your sender address in the dashboard. Check `FROM_EMAIL` is set.

**No weather** — New API keys take ~10 min to activate. Try location as a plain city name: `"London"` not `"London, UK"`.

**No news** — The free NewsAPI tier works for top headlines; the `everything` endpoint (used for keyword searches) is technically for dev/personal use only on the free plan.

**Test without waiting for the schedule:**
```bash
node dist/index.js --now
```