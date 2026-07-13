// search — look up RCW citations matching a (partial) citation string.
//
// Endpoint (the same JSON API the leg.wa.gov RCW search box uses for
// autocomplete): https://lawdoccitelookup.leg.wa.gov/v1/rcw/<query>/<limit>
// It returns a JSON array of matching cites, e.g.
//   "9A.36" -> ["9A.36","9A.36.011","9A.36.021", ...]
//
// IMPORTANT: this matches CITATIONS, not keywords. Free-text words like
// "assault" return []. There is no public full-text RCW search API, so this
// tool is a citation finder — its results feed straight into get_section.

import { fetchJson } from "../http.js";

const LOOKUP = "https://lawdoccitelookup.leg.wa.gov/v1/rcw/";

export async function searchCites(query: string, limit = 10): Promise<string[]> {
  const q = query.trim();
  if (!q) return [];
  const n = Math.min(Math.max(Math.trunc(limit), 1), 25);
  const url = `${LOOKUP}${encodeURIComponent(q)}/${n}`;
  const results = await fetchJson<unknown>(url);
  if (!Array.isArray(results)) return [];
  return results.filter((r): r is string => typeof r === "string");
}
