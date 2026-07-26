import { Quote } from "../types";
import { getJson } from "./http";

// ZenQuotes needs no key, but it rate-limits per source IP — and Workers egress
// from shared Cloudflare IPs, so that budget is shared with everyone else on the
// platform rather than being ours alone. One request a day is nowhere near the
// limit, but an occasional 429 here is expected and must never take the email
// down with it: on failure the section is simply omitted.
// It is also just slow — measured cold responses of 10s+ against a 0.7s warm one.
// Hence a longer timeout than the other sources: this runs in parallel with them,
// and waiting on a socket costs wall-clock, not the CPU time Workers actually bills.
export async function fetchQuote(): Promise<Quote | null> {
  try {
    const data = await getJson<Array<{ q: string; a: string }>>(
      "https://zenquotes.io/api/random",
      undefined,
      20_000
    );
    const q = data[0];
    if (!q?.q) return null;
    return { text: q.q, author: q.a };
  } catch (err: any) {
    console.error("[quote] Failed to fetch:", err.message);
    return null;
  }
}
