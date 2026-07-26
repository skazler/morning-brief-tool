import { BriefingData, WeatherData, NewsSection, Quote } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// HTML EMAIL RENDERER
// ─────────────────────────────────────────────────────────────────────────────
//
// Visual language: aristocratic sci-fi with mechanical undertones. Black and
// silver, no colour. Display serif for anything editorial, monospace for
// anything instrumental (labels, indices, readouts), hairline rules for the
// panel seams. No emoji and no images — the tone comes entirely from type.
//
// Email-client constraints drive the markup, so a few things look dated on
// purpose:
//   · Tables, not flex/grid. The old template used flexbox, which silently
//     collapses in Outlook's Word rendering engine.
//   · Styles inline on the elements. Gmail strips <head><style> in several
//     contexts (notably non-Gmail accounts in the mobile app); inline survives.
//     The <style> block holds only what inline cannot express — @media and
//     :hover — so losing it degrades gracefully instead of unstyling the page.
//   · No linear-gradient carrying meaning. Outlook ignores it, so gradients
//     only ever sit on top of an equivalent solid background-color.
//   · color-scheme is pinned dark. Without it Gmail and Outlook.com "helpfully"
//     invert dark emails, which would turn silver-on-black into mud.

// ─── Palette ─────────────────────────────────────────────────────────────────

const C = {
  void: "#07080a", // page behind the panel
  panel: "#0d0f12", // main surface
  panelInset: "#101317", // recessed blocks (weather, quote)
  hair: "#22262c", // seams and dividers
  hairLit: "#3b424b", // emphasised seam
  silver: "#dbdfe5", // primary text
  silverDim: "#98a0a9", // secondary text
  silverFaint: "#6a727b", // instrument labels, meta
  white: "#eef1f5", // headline / readout
};

// Font stacks are quoted with SINGLE quotes deliberately. These get interpolated
// into double-quoted style="..." attributes, and a double quote inside would
// terminate the attribute early — silently dropping every declaration after
// font-family and leaving the mail unstyled.
const SERIF =
  `Didot, 'Bodoni MT', 'Hoefler Text', 'Playfair Display', ` +
  `'Times New Roman', Georgia, serif`;

const MONO =
  `'SF Mono', ui-monospace, SFMono-Regular, 'Roboto Mono', Menlo, ` +
  `Consolas, 'Courier New', monospace`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Condition rendered as an aviation-style code rather than a pictogram.
 * METAR abbreviations read as instrumentation, which is the register we want,
 * and they dodge the emoji-vs-text presentation lottery across clients.
 */
function conditionCode(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes("thunder")) return "TS";
  if (d.includes("drizzle")) return "DZ";
  if (d.includes("rain")) return "RA";
  if (d.includes("snow")) return "SN";
  if (d.includes("mist") || d.includes("haze")) return "BR";
  if (d.includes("fog")) return "FG";
  if (d.includes("cloud")) {
    if (d.includes("few")) return "FEW";
    if (d.includes("scattered")) return "SCT";
    if (d.includes("broken")) return "BKN";
    return "OVC";
  }
  if (d.includes("clear")) return "CLR";
  return "UNK";
}

function tempUnit(units: "imperial" | "metric") {
  return units === "imperial" ? "°F" : "°C";
}

function windUnit(units: "imperial" | "metric") {
  return units === "imperial" ? "MPH" : "M/S";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Trim to a word boundary. Done here rather than with -webkit-line-clamp,
 * which only lands in WebKit clients and leaves everyone else with a wall of
 * Guardian trailText.
 */
function truncate(s: string, max = 150): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// ─── Primitives ──────────────────────────────────────────────────────────────

/** 1px seam. `line-height` and the nbsp keep Outlook from inflating the row. */
function seam(color = C.hair, inset = 0): string {
  return `<div style="height:1px;line-height:1px;font-size:0;background-color:${color};margin:${inset}px 0;">&nbsp;</div>`;
}

/**
 * Instrument-panel section label: `03 / WORLD NEWS ─────────────`.
 * The index is the mechanical tell; the rule running to the right edge is the
 * aristocratic one.
 */
function sectionLabel(index: number, label: string): string {
  return `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="font-family:${MONO};font-size:10px;letter-spacing:0.22em;color:${C.silverFaint};text-transform:uppercase;white-space:nowrap;padding-right:14px;">
              ${pad2(index)}&nbsp;/&nbsp;${escapeHtml(label)}
            </td>
            <td width="100%" style="width:100%;">${seam()}</td>
          </tr>
        </table>`;
}

/** Centred lozenge divider — the one ornamental flourish, used sparingly. */
function lozenge(): string {
  return `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="50%" style="width:50%;vertical-align:middle;">${seam()}</td>
            <td style="padding:0 12px;font-family:${MONO};font-size:9px;color:${C.hairLit};line-height:1;white-space:nowrap;">&#9670;</td>
            <td width="50%" style="width:50%;vertical-align:middle;">${seam()}</td>
          </tr>
        </table>`;
}

/** Wraps section content in the standard 32px gutter. */
function section(inner: string): string {
  return `
      <tr>
        <td class="gutter" style="padding:26px 32px 24px 32px;">
${inner}
        </td>
      </tr>`;
}

// ─── Section renderers ───────────────────────────────────────────────────────

function renderWeather(w: WeatherData, index: number): string {
  const unit = tempUnit(w.units);
  const wunit = windUnit(w.units);
  const code = conditionCode(w.description);

  // Readout cells share one style; border-left draws the dividers between them.
  const cell = (label: string, value: string, first = false) => `
              <td width="33.33%" style="width:33.33%;padding:0 0 0 ${first ? 0 : 14}px;${first ? "" : `border-left:1px solid ${C.hair};`}text-align:${first ? "left" : "center"};">
                <div style="font-family:${MONO};font-size:9px;letter-spacing:0.18em;color:${C.silverFaint};text-transform:uppercase;padding-bottom:5px;">${label}</div>
                <div style="font-family:${MONO};font-size:13px;color:${C.silverDim};">${value}</div>
              </td>`;

  return section(`${sectionLabel(index, "Atmosphere")}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:18px;background-color:${C.panelInset};border:1px solid ${C.hair};">
            <tr>
              <td style="padding:22px 22px 18px 22px;">

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="font-family:${MONO};font-size:10px;letter-spacing:0.2em;color:${C.silverFaint};text-transform:uppercase;">
                      ${escapeHtml(w.city)} &middot; ${escapeHtml(w.country)}
                    </td>
                    <td align="right" style="font-family:${MONO};font-size:10px;letter-spacing:0.2em;color:${C.silverDim};white-space:nowrap;">
                      [&thinsp;${code}&thinsp;]
                    </td>
                  </tr>
                </table>

                <div class="bigtemp" style="font-family:${SERIF};font-size:54px;line-height:1.02;color:${C.white};padding:14px 0 6px 0;letter-spacing:-0.01em;">
                  ${w.temp}<span style="font-size:24px;color:${C.silverDim};">${unit}</span>
                </div>

                <div style="font-family:${SERIF};font-size:15px;font-style:italic;color:${C.silverDim};padding-bottom:18px;">
                  ${escapeHtml(w.description)}
                </div>

                ${seam()}

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:16px;">
                  <tr>
${cell("Feels", `${w.feelsLike}${unit}`, true)}
${cell("Humidity", `${w.humidity}%`)}
${cell("Wind", `${w.windSpeed} ${wunit}`)}
                  </tr>
                </table>

              </td>
            </tr>
          </table>`);
}

function renderNewsSection(s: NewsSection, index: number): string {
  const articles = s.articles
    .map(
      (a, i) => `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:${i === 0 ? 18 : 0}px;">
            <tr>
              <td width="34" style="width:34px;vertical-align:top;padding-top:3px;font-family:${MONO};font-size:10px;color:${C.hairLit};letter-spacing:0.1em;">
                ${pad2(i + 1)}
              </td>
              <td style="vertical-align:top;padding-bottom:${i === s.articles.length - 1 ? 0 : 20}px;">
                <a class="headline" href="${encodeURI(a.url)}" style="font-family:${SERIF};font-size:17px;line-height:1.34;color:${C.silver};text-decoration:none;display:block;">
                  ${escapeHtml(a.title)}
                </a>
                ${
                  a.description
                    ? `<div style="font-family:${SERIF};font-size:13px;line-height:1.55;color:${C.silverDim};padding-top:6px;">${escapeHtml(truncate(a.description))}</div>`
                    : ""
                }
                <div style="font-family:${MONO};font-size:9px;letter-spacing:0.16em;color:${C.silverFaint};text-transform:uppercase;padding-top:9px;">
                  ${escapeHtml(a.source)} &middot; ${escapeHtml(a.publishedAt)}
                </div>
              </td>
            </tr>
          </table>`
    )
    .join("");

  return section(`${sectionLabel(index, s.heading)}${articles}`);
}

function renderQuote(q: Quote): string {
  return `
      <tr>
        <td class="gutter" style="padding:30px 32px 32px 32px;background-color:${C.panelInset};border-top:1px solid ${C.hair};">
${lozenge()}
          <div style="font-family:${SERIF};font-size:20px;font-style:italic;line-height:1.5;color:${C.silver};text-align:center;padding:22px 8px 16px 8px;">
            &ldquo;${escapeHtml(q.text)}&rdquo;
          </div>
          <div style="font-family:${MONO};font-size:9px;letter-spacing:0.24em;color:${C.silverFaint};text-transform:uppercase;text-align:center;padding-bottom:22px;">
            ${escapeHtml(q.author)}
          </div>
${lozenge()}
        </td>
      </tr>`;
}

// ─── Main render ─────────────────────────────────────────────────────────────

export function renderEmail(data: BriefingData): string {
  // Sections are numbered in the order they appear, so the register stays
  // continuous when a source drops out and its section is omitted.
  let index = 0;
  const blocks: string[] = [];

  if (data.weather) blocks.push(renderWeather(data.weather, ++index));
  for (const s of data.newsSections) blocks.push(renderNewsSection(s, ++index));

  const body = blocks.join(`
      <tr><td style="padding:0 32px;">${seam()}</td></tr>`);

  const quoteHtml = data.quote ? renderQuote(data.quote) : "";

  return `<!DOCTYPE html>
<html lang="en" style="color-scheme:dark;supported-color-schemes:dark;">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark only" />
  <meta name="supported-color-schemes" content="dark only" />
  <title>Morning Briefing</title>
  <style>
    /* Only what inline styles cannot express. Everything load-bearing is
       inline, so stripping this block costs polish, not legibility. */
    :root { color-scheme: dark only; supported-color-schemes: dark only; }

    a.headline:hover { color: ${C.white} !important; }

    /* Outlook.com and Gmail dark-mode overrides both key off these. */
    [data-ogsc] .surface { background-color: ${C.panel} !important; }
    [data-ogsc] .void    { background-color: ${C.void} !important; }

    @media only screen and (max-width: 620px) {
      .shell   { width: 100% !important; }
      .gutter  { padding-left: 20px !important; padding-right: 20px !important; }
      .bigtemp { font-size: 46px !important; }
    }
  </style>
</head>
<body class="void" style="margin:0;padding:0;background-color:${C.void};">
  <!-- Preheader: the inbox preview line, hidden in the body itself. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
    ${escapeHtml(data.date)} &mdash; atmosphere, dispatches, and one thought.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="void" style="background-color:${C.void};">
    <tr>
      <td align="center" style="padding:32px 12px 40px 12px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="shell" style="width:600px;max-width:600px;">

          <!-- Brushed edge. The gradient is decoration over a solid fallback,
               so Outlook simply renders a flat silver seam. -->
          <tr>
            <td style="height:2px;line-height:2px;font-size:0;background-color:${C.hairLit};background-image:linear-gradient(90deg,${C.hair} 0%,#8f979f 50%,${C.hair} 100%);">&nbsp;</td>
          </tr>

          <tr>
            <td class="surface" style="background-color:${C.panel};border:1px solid ${C.hair};border-top:none;">

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">

                <!-- Masthead -->
                <tr>
                  <td class="gutter" align="center" style="padding:38px 32px 30px 32px;">
                    <div style="font-family:${MONO};font-size:9px;letter-spacing:0.42em;color:${C.silverFaint};text-transform:uppercase;padding-bottom:16px;">
                      Morning Briefing
                    </div>
                    <div style="font-family:${SERIF};font-size:31px;line-height:1.2;color:${C.white};letter-spacing:0.005em;">
                      Good morning, ${escapeHtml(data.recipientName)}
                    </div>
                    <div style="padding:20px 0 0 0;">${lozenge()}</div>
                    <div style="font-family:${MONO};font-size:10px;letter-spacing:0.22em;color:${C.silverDim};text-transform:uppercase;padding-top:18px;">
                      ${escapeHtml(data.date)}
                    </div>
                  </td>
                </tr>

                <tr><td style="padding:0 32px;">${seam()}</td></tr>

                ${body}

                ${quoteHtml}

              </table>

            </td>
          </tr>

          <!-- Footer, outside the panel -->
          <tr>
            <td align="center" style="padding:22px 32px 0 32px;font-family:${MONO};font-size:9px;letter-spacing:0.2em;color:${C.silverFaint};text-transform:uppercase;line-height:1.9;">
              Compiled automatically &middot; Cloudflare Workers<br />
              <a href="#" style="color:${C.silverFaint};text-decoration:none;border-bottom:1px solid ${C.hair};">Unsubscribe</a>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}
