# ☀️ Morning Briefing

A self-hosted, fully configurable daily email digest. Every morning it fetches weather, news headlines, category feeds, keyword searches, and a quote — then delivers a clean HTML email to your inbox.

Built with **TypeScript + Node.js**.

---

## Features

- 🌤 **Weather** — current conditions for any city (OpenWeatherMap)
- 📰 **Top Headlines** — country-specific top stories (NewsAPI)
- 📂 **Category News** — Technology, Business, Health, Science, Sports, Entertainment
- 🔍 **Keyword Searches** — track any topic, company, or stock ticker
- ✨ **Quote of the Day** — no API key needed (zenquotes.io)
- 📬 **Dual email delivery** — SMTP (Gmail, Outlook, etc.) or SendGrid
- ⏰ **Cron scheduling** — any schedule you like, runs as a persistent process

---

## Prerequisites

- Node.js 18+
- A free [OpenWeatherMap](https://openweathermap.org/api) API key
- A free [NewsAPI](https://newsapi.org/register) API key
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

Uses standard cron syntax. Default is 7:00 AM daily.

```ts
schedule: "0 7 * * *"       // 7:00 AM every day
schedule: "30 6 * * 1-5"    // 6:30 AM weekdays only
schedule: "0 8 * * 0"       // 8:00 AM Sundays only
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

### News — Top Headlines

```ts
topHeadlines: {
  enabled: true,
  country: "us",         // us, gb, au, ca, de, fr, in, jp, ...
  pageSize: 5,
}
```

### News — Categories

Toggle any category on or off, or adjust how many stories appear per section.

```ts
categories: [
  { name: "Technology", category: "technology", pageSize: 3, enabled: true  },
  { name: "Business",   category: "business",   pageSize: 3, enabled: true  },
  { name: "Science",    category: "science",    pageSize: 3, enabled: false },
  { name: "Health",     category: "health",     pageSize: 3, enabled: false },
]
```

Valid category values: `business` `entertainment` `health` `science` `sports` `technology`

### News — Keyword Searches

Track anything — a company, a stock, a topic, a person.

```ts
searches: [
  { name: "AI News",     query: "artificial intelligence", pageSize: 3, enabled: true },
  { name: "Apple",       query: "AAPL OR Apple Inc",       pageSize: 3, enabled: true },
  { name: "My Industry", query: "climate tech",            pageSize: 3, enabled: false },
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
├── src/
│   ├── services/
│   │   ├── weather.ts  ← OpenWeatherMap fetcher
│   │   ├── news.ts     ← NewsAPI fetcher (headlines, categories, searches)
│   │   ├── quote.ts    ← ZenQuotes fetcher
│   │   └── mailer.ts   ← SMTP + SendGrid sender
│   ├── types/
│   │   └── index.ts    ← Shared TypeScript types
│   ├── config.ts       ← All user-facing settings (start here)
│   ├── template.ts     ← HTML email renderer
│   └── index.ts        ← Entry point + cron scheduler
├── .env.example        ← Copy to .env and fill in your keys
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
| NewsAPI | All news sections | ✅ 100 calls/day | [newsapi.org/register](https://newsapi.org/register) |
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