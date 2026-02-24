import axios from "axios";
import { NewsSection, NewsArticle } from "../types";
import { config } from "../config";

// Uses the Algolia HN Search API — no key needed
// Docs: https://hn.algolia.com/api

export async function fetchHackerNews(): Promise<NewsSection | null> {
  const { pageSize, minScore, hoursBack } = config.hackerNews;

  // Only fetch stories published within the configured window
  const since = Math.floor(Date.now() / 1000) - hoursBack * 60 * 60;

  try {
    const { data } = await axios.get("https://hn.algolia.com/api/v1/search", {
      params: {
        tags: "story",
        numericFilters: `points>=${minScore},created_at_i>${since}`,
        hitsPerPage: pageSize,
      },
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
      publishedAt: new Date(h.created_at).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    }));

    return { heading: "Hacker News", articles };
  } catch (err: any) {
    console.error("[hackernews] Failed to fetch:", err.message);
    return null;
  }
}
