// ─────────────────────────────────────────────────────────────────────────────
// TIMEZONE HANDLING
// ─────────────────────────────────────────────────────────────────────────────
//
// A Worker's clock is always UTC and there is no `TZ` to set, so every date here
// is formatted with an explicit `timeZone`. Never call bare `toLocaleTimeString()`
// or `new Date().getHours()` in this codebase — on Workers those silently mean UTC,
// which is what put a "fix timezone" commit in the history twice already.

/**
 * Wall-clock field values for `date` as seen in `timeZone`.
 * `hourCycle: "h23"` rather than `hour12: false` — the latter renders midnight
 * as hour "24" on V8, which would break the arithmetic in `shouldRunNow`.
 */
function zonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  });

  const out: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") out[part.type] = part.value;
  }
  return out;
}

function ordinal(day: number): string {
  if (day % 100 >= 11 && day % 100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

/** "Sunday, July 26th 2026" — the date line at the top of the email. */
export function formatLongDate(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${p.weekday}, ${p.month} ${ordinal(Number(p.day))} ${p.year}`;
}

/** "July 26th" — substituted into the subject line. */
export function formatShortDate(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${p.month} ${ordinal(Number(p.day))}`;
}

/** "5:03 PM" — article publish times, in the reader's timezone rather than UTC. */
export function formatTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** How far apart two times of day are, in minutes, going the short way round midnight. */
function circularMinuteDelta(a: number, b: number): number {
  const raw = Math.abs(a - b);
  return Math.min(raw, 1440 - raw);
}

/**
 * The DST gate. Cloudflare cron is UTC-only, so each job is registered at both
 * its CDT and CST UTC hour and this decides which firing is the real one.
 *
 * Matching is a ±`toleranceMinutes` window, not an exact compare: Cloudflare can
 * fire a minute or two late and an exact match would skip the day's run entirely.
 * The two DST candidates sit an hour apart, so the window can never match both.
 */
export function shouldRunNow(
  now: Date,
  target: { timezone: string; hour: number; minute: number },
  toleranceMinutes = 10
): boolean {
  const p = zonedParts(now, target.timezone);
  const nowMinutes = Number(p.hour) * 60 + Number(p.minute);
  const targetMinutes = target.hour * 60 + target.minute;
  return (
    circularMinuteDelta(nowMinutes, targetMinutes) <= toleranceMinutes
  );
}
