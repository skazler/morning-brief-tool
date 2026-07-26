import { Config } from "../config";
import { BriefingData, NewsSection, WeatherData, Quote } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// DISCORD DELIVERY
// ─────────────────────────────────────────────────────────────────────────────
//
// The same briefing the email carries, posted to a channel webhook. Sent as
// embeds rather than a plain message for one hard reason: message `content` is
// capped at 2000 characters and fifteen headlines clear that on their own.
// Embeds also render markdown links, which `content` does not.
//
// The limit that actually bites is the aggregate one — Discord sums the title,
// description and footer of EVERY embed and rejects the whole payload over
// 6000. There is no partial post, so an over-budget briefing is a missing
// briefing. `fitBudget` below is what keeps that from happening silently.

const MAX_EMBEDS = 10;
const MAX_EMBED_DESC = 4096;

// Deliberately under Discord's 6000 aggregate: emoji count as multiple
// characters against the limit, and being a little short costs nothing while
// being one character long costs the entire morning's post.
const BUDGET = 5200;

const COLOR_WEATHER = 0xf5a623; // amber, matches the ☀️ subject line
const COLOR_NEWS = 0x4a7ebb;
const COLOR_QUOTE = 0x6b7280;

interface Embed {
  title?: string;
  description?: string;
  color?: number;
  footer?: { text: string };
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max - 1).trimEnd() + "…";
}

/**
 * Discord counts an embed's length as title + description + footer. Mirrors
 * their accounting so `fitBudget` can trust it.
 */
function embedLength(embed: Embed): number {
  return (
    (embed.title?.length ?? 0) +
    (embed.description?.length ?? 0) +
    (embed.footer?.text.length ?? 0)
  );
}

/**
 * A markdown link, with the brackets that would break it escaped. Headline
 * punctuation is not under our control — The Guardian ships titles containing
 * square brackets, and an unescaped one silently swallows the rest of the line.
 */
function link(title: string, url: string): string {
  const safe = truncate(title, 120).replace(/([[\]])/g, "\\$1");
  return `[${safe}](${url})`;
}

/**
 * Trim a description to fit `max`, cutting at line boundaries.
 *
 * A naive `slice` would land mid-link and leave a raw `[Half a headl` on the
 * page, so whole bullets go or stay — never half of one.
 */
function trimToLines(description: string, max: number): string {
  if (description.length <= max) return description;

  const kept: string[] = [];
  let used = 0;
  for (const line of description.split("\n")) {
    if (used + line.length + 1 > max) break;
    kept.push(line);
    used += line.length + 1;
  }
  return kept.join("\n");
}

// ─── Section builders ─────────────────────────────────────────────────────────

function weatherEmbed(weather: WeatherData): Embed {
  const deg = weather.units === "imperial" ? "°F" : "°C";
  const speed = weather.units === "imperial" ? "mph" : "m/s";

  return {
    title: `🌤  ${weather.city}, ${weather.country}`,
    description:
      `**${Math.round(weather.temp)}${deg}** · ${weather.description} · ` +
      `feels like ${Math.round(weather.feelsLike)}${deg}\n` +
      `Humidity ${weather.humidity}% · Wind ${Math.round(weather.windSpeed)} ${speed}`,
    color: COLOR_WEATHER,
  };
}

/**
 * One embed per news section. Article descriptions are deliberately dropped —
 * the email is the place to read, this is the place to scan. Fifteen headlines
 * with snippets would eat the whole budget and push the quote off the end.
 */
function sectionEmbed(section: NewsSection): Embed | null {
  if (!section.articles.length) return null;

  const lines = section.articles.map(
    (article) => `• ${link(article.title, article.url)}  —  *${article.source}*`
  );

  return {
    title: section.heading,
    description: truncate(lines.join("\n"), MAX_EMBED_DESC),
    color: COLOR_NEWS,
  };
}

function quoteEmbed(quote: Quote): Embed {
  return {
    description: `*"${truncate(quote.text, 500)}"*`,
    footer: { text: `— ${quote.author}` },
    color: COLOR_QUOTE,
  };
}

/**
 * Keep embeds under both ceilings, dropping from the end rather than the start:
 * weather and the first news section matter more than the quote.
 *
 * A section that only partly fits is trimmed to whole bullets instead of being
 * dropped — better to show three of five headlines than none.
 */
function fitBudget(embeds: Embed[]): Embed[] {
  const fitted: Embed[] = [];
  let total = 0;

  for (const embed of embeds.slice(0, MAX_EMBEDS)) {
    const length = embedLength(embed);

    if (total + length <= BUDGET) {
      fitted.push(embed);
      total += length;
      continue;
    }

    const room = BUDGET - total - (embed.title?.length ?? 0);
    // Below ~200 chars there is no room for a usable number of bullets, so
    // stop cleanly rather than appending a one-line stub.
    if (room > 200 && embed.description) {
      const trimmed = trimToLines(embed.description, room);
      if (trimmed) fitted.push({ ...embed, description: trimmed });
    }
    break;
  }

  return fitted;
}

// ─── Send ─────────────────────────────────────────────────────────────────────

export function renderDiscord(briefing: BriefingData) {
  const embeds: Embed[] = [];

  if (briefing.weather) embeds.push(weatherEmbed(briefing.weather));
  for (const section of briefing.newsSections) {
    const embed = sectionEmbed(section);
    if (embed) embeds.push(embed);
  }
  if (briefing.quote) embeds.push(quoteEmbed(briefing.quote));

  return {
    content: `☀️ **Morning Briefing** — ${briefing.date}`,
    embeds: fitBudget(embeds),
    // Headlines are attacker-controlled text as far as this Worker is
    // concerned. Without this, a story titled "@everyone ..." would ping the
    // whole server at 5 AM.
    allowed_mentions: { parse: [] as string[] },
  };
}

export async function sendDiscord(
  cfg: Config,
  briefing: BriefingData
): Promise<void> {
  const { webhookUrl } = cfg.discord;
  if (!webhookUrl) throw new Error("DISCORD_WEBHOOK_URL is not set.");

  // `?wait=true` makes Discord validate and return the created message instead
  // of a fire-and-forget 204 — otherwise a malformed payload looks like success.
  const response = await fetch(`${webhookUrl}?wait=true`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(renderDiscord(briefing)),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(
      `Discord error ${response.status}: ${(await response.text()).slice(0, 300)}`
    );
  }

  console.log("[discord] Briefing posted to webhook");
}
