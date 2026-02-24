import axios from "axios";
import { format } from "date-fns";
import { config } from "../config";
import { NewsArticle, NewsSection } from "../types";

const BASE = "https://newsapi.org/v2";

async function fetchArticles(
  endpoint: string,
  params: Record<string, string | number>
): Promise<NewsArticle[]> {
  const { apiKey } = config.news;
  if (!apiKey) return [];

  try {
    const { data } = await axios.get(`${BASE}/${endpoint}`, {
      params: { ...params, apiKey },
    });

    return (data.articles ?? []).map((a: any) => ({
      title: a.title ?? "Untitled",
      source: a.source?.name ?? "Unknown",
      description: a.description ?? null,
      url: a.url,
      publishedAt: format(new Date(a.publishedAt), "h:mm a"),
    }));
  } catch (err: any) {
    console.error("[news] Fetch error:", err.response?.data ?? err.message);
    return [];
  }
}

export async function fetchNewsSections(): Promise<NewsSection[]> {
  const { news } = config;
  if (!news.apiKey) {
    console.warn("[news] No API key set — skipping news.");
    return [];
  }

  const sections: NewsSection[] = [];
  const promises: Promise<void>[] = [];

  // Top Headlines
  if (news.topHeadlines.enabled) {
    promises.push(
      fetchArticles("top-headlines", {
        country: news.topHeadlines.country,
        pageSize: news.topHeadlines.pageSize,
      }).then((articles) => {
        if (articles.length) {
          sections.push({ heading: "Top Headlines", articles });
        }
      })
    );
  }

  // Category sections
  for (const cat of news.categories) {
    if (!cat.enabled) continue;
    promises.push(
      fetchArticles("top-headlines", {
        category: cat.category,
        country: "us",
        pageSize: cat.pageSize,
      }).then((articles) => {
        if (articles.length) {
          sections.push({ heading: cat.name, articles });
        }
      })
    );
  }

  // Keyword searches
  for (const search of news.searches) {
    if (!search.enabled) continue;
    promises.push(
      fetchArticles("everything", {
        q: search.query,
        sortBy: "publishedAt",
        pageSize: search.pageSize,
        language: "en",
      }).then((articles) => {
        if (articles.length) {
          sections.push({ heading: search.name, articles });
        }
      })
    );
  }

  await Promise.allSettled(promises);

  // Preserve logical order: headlines → categories → searches
  return sections;
}
