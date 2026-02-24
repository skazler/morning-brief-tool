import axios from "axios";
import { NewsSection, NewsArticle } from "../types";
import { config } from "../config";

// The Guardian Open Platform — free key at https://open-platform.theguardian.com/access/
// 500 calls/day on free tier, global coverage, non-US perspective

export async function fetchGuardianSection(
  name: string,
  query: string,
  pageSize: number,
  section?: string
): Promise<NewsSection | null> {
  const { apiKey } = config.guardian;
  if (!apiKey) {
    console.warn("[guardian] No API key set — skipping Guardian.");
    return null;
  }

  try {
    const params: Record<string, string | number> = {
      "api-key": apiKey,
      "page-size": pageSize,
      "show-fields": "trailText",
      "order-by": "newest",
    };

    if (query) params.q = query;
    if (section) params.section = section;

    const { data } = await axios.get(
      "https://content.guardianapis.com/search",
      { params }
    );

    const articles: NewsArticle[] = data.response.results.map((a: any) => ({
      title: a.webTitle,
      source: "The Guardian",
      description: a.fields?.trailText?.replace(/<[^>]+>/g, "") ?? null,
      url: a.webUrl,
      publishedAt: new Date(a.webPublicationDate).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    }));

    return { heading: name, articles };
  } catch (err: any) {
    console.error(
      "[guardian] Failed to fetch:",
      err.response?.data ?? err.message
    );
    return null;
  }
}

export async function fetchGuardianSections(): Promise<NewsSection[]> {
  const { sections } = config.guardian;
  const results = await Promise.all(
    sections
      .filter((s) => s.enabled)
      .map((s) => fetchGuardianSection(s.name, s.query, s.pageSize, s.section))
  );
  return results.filter((s): s is NewsSection => s !== null);
}
