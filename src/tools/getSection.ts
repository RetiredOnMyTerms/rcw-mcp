// get_section — scrape a single RCW section page and parse it.
//
// Page: https://app.leg.wa.gov/RCW/default.aspx?cite=<CITE>
// Markup pinned against the live page (2026):
//   <h1> ... RCW 9A.36.021 ...          -> citation
//   <h2> ... Assault in the second ...  -> caption
//   <div id="contentWrapper" ...>       -> body + [history] + Notes
// Each subsection is its own <div>, so we convert block-closing tags to
// newlines before flattening to text (cheerio .text() would run them together).

import * as cheerio from "cheerio";
import { fetchText } from "../http.js";
import { withCache } from "../cache.js";

const SECTION_CITE = /^\d+[A-Z]?\.\d+[A-Z]?\.\d+$/;
const BASE = "https://app.leg.wa.gov/RCW/default.aspx?cite=";
const TTL_MS = 60 * 60 * 1000; // 1 hour

export interface Section {
  cite: string;
  caption: string;
  text: string;
  url: string;
}

export async function getSection(rawCite: string): Promise<Section> {
  const cite = rawCite.trim().toUpperCase();
  if (!SECTION_CITE.test(cite)) {
    throw new Error(
      `"${rawCite}" is not a section-level RCW cite. ` +
        `Use title.chapter.section, e.g. 9A.36.021. ` +
        `To find a cite, use the search tool.`,
    );
  }

  const url = `${BASE}${encodeURIComponent(cite)}`;

  return withCache(`section:${cite}`, TTL_MS, async () => {
    const html = await fetchText(url);
    const $ = cheerio.load(html);

    const caption = $("h2").first().text().trim();

    const container = $("#contentWrapper");
    const rawHtml = container.length ? (container.html() ?? "") : "";
    const withBreaks = rawHtml
      .replace(/<\/(div|p|h1|h2|h3|li|tr)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n");

    const text = cheerio
      .load(`<root>${withBreaks}</root>`)("root")
      .text()
      .replace(/ /g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/ ?\n ?/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!text) {
      throw new Error(
        `No statutory text found for RCW ${cite}. ` +
          `It may be repealed/decodified, or the page markup changed.`,
      );
    }

    return { cite, caption: caption || "(no caption)", text, url };
  });
}
