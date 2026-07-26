import { Config } from "../config";
import { NewsSection, NewsArticle } from "../types";
import { formatTime } from "../time";
import { getJson } from "./http";

// Uses the Algolia HN Search API — no key needed
// Docs: https://hn.algolia.com/api

export async function fetchHackerNews(cfg: Config): Promise<NewsSection | null> {
  const { pageSize, minScore, hoursBack } = cfg.hackerNews;

  // Only fetch stories published within the configured window
  const since = Math.floor(Date.now() / 1000) - hoursBack * 60 * 60;

  try {
    const data = await getJson("https://hn.algolia.com/api/v1/search", {
      tags: "story",
      numericFilters: `points>=${minScore},created_at_i>${since}`,
      hitsPerPage: pageSize,
    });

    if (!data.hits.length) {
      console.warn(
        "[hackernews] No stories found — try lowering minScore or increasing hoursBack."
      );
      return null;
    }

    const articles: NewsArticle[] = data.hits.map((h: any) => ({
      title: h.title,
      source: h.url
        ? new URL(h.url).hostname.replace("www.", "")
        : "news.ycombinator.com",
      description: `${h.points} points · ${h.num_comments} comments`,
      url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
      publishedAt: formatTime(new Date(h.created_at), cfg.schedule.timezone),
    }));

    return { heading: "Hacker News", articles };
  } catch (err: any) {
    console.error("[hackernews] Failed to fetch:", err.message);
    return null;
  }
}
