import { BriefingData, WeatherData, NewsSection, Quote } from "./types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function weatherEmoji(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes("thunder")) return "⛈️";
  if (d.includes("drizzle") || d.includes("rain")) return "🌧️";
  if (d.includes("snow")) return "❄️";
  if (d.includes("mist") || d.includes("fog") || d.includes("haze"))
    return "🌫️";
  if (d.includes("cloud")) return d.includes("few") ? "🌤️" : "☁️";
  if (d.includes("clear")) return "☀️";
  return "🌡️";
}

function tempUnit(units: "imperial" | "metric") {
  return units === "imperial" ? "°F" : "°C";
}

function windUnit(units: "imperial" | "metric") {
  return units === "imperial" ? "mph" : "m/s";
}

// ─── Section renderers ───────────────────────────────────────────────────────

function renderWeather(w: WeatherData): string {
  const unit = tempUnit(w.units);
  const wunit = windUnit(w.units);
  const emoji = weatherEmoji(w.description);

  return `
    <div class="section">
      <h2>🌤 Weather — ${w.city}, ${w.country}</h2>
      <div class="weather-card">
        <div class="weather-main">
          <span class="weather-icon">${emoji}</span>
          <span class="weather-temp">${w.temp}${unit}</span>
        </div>
        <p class="weather-desc">${w.description}</p>
        <div class="weather-details">
          <span>Feels like ${w.feelsLike}${unit}</span>
          <span>💧 ${w.humidity}% humidity</span>
          <span>💨 ${w.windSpeed} ${wunit}</span>
        </div>
      </div>
    </div>`;
}

function renderNewsSection(section: NewsSection): string {
  const articles = section.articles
    .map(
      (a) => `
      <div class="article">
        <a href="${a.url}" class="article-title">${a.title}</a>
        ${a.description ? `<p class="article-desc">${a.description}</p>` : ""}
        <p class="article-meta">${a.source} · ${a.publishedAt}</p>
      </div>`
    )
    .join("");

  return `
    <div class="section">
      <h2>📰 ${section.heading}</h2>
      ${articles}
    </div>`;
}

function renderQuote(q: Quote): string {
  return `
    <div class="section quote-section">
      <h2>✨ Quote of the Day</h2>
      <blockquote>
        <p>"${q.text}"</p>
        <footer>— ${q.author}</footer>
      </blockquote>
    </div>`;
}

// ─── Main render ─────────────────────────────────────────────────────────────

export function renderEmail(data: BriefingData): string {
  const weatherHtml = data.weather ? renderWeather(data.weather) : "";
  const newsHtml = data.newsSections.map(renderNewsSection).join("");
  const quoteHtml = data.quote ? renderQuote(data.quote) : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Morning Briefing</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      background: #f0f4f8;
      color: #1a202c;
      padding: 24px 16px;
    }

    .wrapper {
      max-width: 600px;
      margin: 0 auto;
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 16px 16px 0 0;
      padding: 32px 32px 24px;
      color: white;
      text-align: center;
    }
    .header h1 { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
    .header .subtitle { font-size: 14px; opacity: 0.85; margin-top: 6px; }

    /* Body */
    .body {
      background: white;
      border-radius: 0 0 16px 16px;
      padding: 8px 0 24px;
    }

    /* Sections */
    .section {
      padding: 24px 32px;
      border-bottom: 1px solid #edf2f7;
    }
    .section:last-child { border-bottom: none; }

    .section h2 {
      font-size: 15px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #4a5568;
      margin-bottom: 16px;
    }

    /* Weather */
    .weather-card {
      background: linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%);
      border-radius: 12px;
      padding: 20px;
    }
    .weather-main {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
    }
    .weather-icon { font-size: 40px; }
    .weather-temp { font-size: 42px; font-weight: 700; color: #1e40af; }
    .weather-desc { font-size: 16px; color: #374151; margin: 4px 0 12px; }
    .weather-details {
      display: flex;
      gap: 16px;
      font-size: 13px;
      color: #6b7280;
      flex-wrap: wrap;
    }

    /* Articles */
    .article { margin-bottom: 18px; }
    .article:last-child { margin-bottom: 0; }

    .article-title {
      display: block;
      font-size: 15px;
      font-weight: 600;
      color: #2d3748;
      text-decoration: none;
      line-height: 1.4;
      margin-bottom: 5px;
    }
    .article-title:hover { color: #667eea; }

    .article-desc {
      font-size: 13px;
      color: #718096;
      line-height: 1.5;
      margin-bottom: 5px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .article-meta {
      font-size: 11px;
      color: #a0aec0;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* Quote */
    .quote-section { background: #fafafa; }
    blockquote p {
      font-size: 17px;
      font-style: italic;
      color: #4a5568;
      line-height: 1.6;
      margin-bottom: 10px;
    }
    blockquote footer {
      font-size: 13px;
      color: #a0aec0;
      font-style: normal;
    }

    /* Footer */
    .footer {
      text-align: center;
      font-size: 12px;
      color: #a0aec0;
      margin-top: 20px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Good morning, ${data.recipientName} ☀️</h1>
      <p class="subtitle">${data.date}</p>
    </div>
    <div class="body">
      ${weatherHtml}
      ${newsHtml}
      ${quoteHtml}
    </div>
    <div class="footer">
      <p>Your personalised morning briefing</p>
      <p>Delivered by morning-briefing · <a href="#" style="color:#a0aec0">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;
}
