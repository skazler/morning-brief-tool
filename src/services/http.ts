// Shared JSON fetcher. Replaces axios — Workers has `fetch` natively, and dropping
// axios removes the last dependency that wanted a Node runtime underneath it.

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    readonly body: string
  ) {
    super(`HTTP ${status} from ${new URL(url).hostname}: ${body.slice(0, 200)}`);
    this.name = "HttpError";
  }
}

/**
 * GET a JSON document. `params` are appended as a query string with values
 * URL-encoded. Throws `HttpError` on a non-2xx so callers can log the body —
 * axios put that on `err.response.data`, which every service was reading.
 *
 * The timeout matters more here than it did on Railway: a Worker invocation that
 * hangs on a dead upstream burns wall-clock against the request and takes the
 * whole email with it, so no single source is allowed to stall the run.
 */
export async function getJson<T = any>(
  url: string,
  params?: Record<string, string | number | undefined>,
  timeoutMs = 10_000
): Promise<T> {
  const target = new URL(url);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== "") {
      target.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(target.toString(), {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new HttpError(response.status, target.toString(), await response.text());
  }

  return (await response.json()) as T;
}
