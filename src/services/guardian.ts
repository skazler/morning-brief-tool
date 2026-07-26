import { Config } from "../config";
import { NewsSection, NewsArticle } from "../types";
import { formatTime } from "../time";
import { getJson } from "./http";

// The Guardian Open Platform — free key at https://open-platform.theguardian.com/access/
// 500 calls/day on free tier, global coverage, non-US perspective

export async function fetchGuardianSection(
  cfg: Config,
  name: string,
  query: string,
  pageSize: number,
  section?: string
): Promise<NewsSection | null> {
  const { apiKey } = cfg.guardian;
  if (!apiKey) {
    console.warn("[guardian] No API key set — skipping Guardian.");
    return null;
  }

  try {
    const data = await getJson("https://content.guardianapis.com/search", {
      "api-key": apiKey,
      "page-size": pageSize,
      "show-fields": "trailText",
      "order-by": "newest",
      q: query || undefined,
      section: section || undefined,
    });

    const articles: NewsArticle[] = data.response.results.map((a: any) => ({
      title: a.webTitle,
      source: "The Guardian",
      description: a.fields?.trailText?.replace(/<[^>]+>/g, "") ?? null,
      url: a.webUrl,
      publishedAt: formatTime(
        new Date(a.webPublicationDate),
        cfg.schedule.timezone
      ),
    }));

    return { heading: name, articles };
  } catch (err: any) {
    console.error("[guardian] Failed to fetch:", err.message);
    return null;
  }
}

export async function fetchGuardianSections(cfg: Config): Promise<NewsSection[]> {
  const { sections } = cfg.guardian;
  const results = await Promise.all(
    sections
      .filter((s) => s.enabled)
      .map((s) =>
        fetchGuardianSection(cfg, s.name, s.query, s.pageSize, s.section)
      )
  );
  return results.filter((s): s is NewsSection => s !== null);
}
