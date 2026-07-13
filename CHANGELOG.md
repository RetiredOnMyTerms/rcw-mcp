# Changelog

All notable changes to this project are documented here. Versioning follows
[Semantic Versioning](https://semver.org/). The version here must match
`package.json` `version`.

## [0.1.0] — 2026-07-12

### Added
- Initial MCP server for the Revised Code of Washington (RCW), stdio transport.
- `get_section` — full text of an RCW section by cite (scrapes `app.leg.wa.gov`,
  parses with cheerio), with in-memory 1-hour cache.
- `search` — RCW citation lookup via the `lawdoccitelookup.leg.wa.gov` JSON API
  (matches citations, not keywords — no public full-text RCW search API exists).
- `cite_affected` — bills in a biennium that affect a cite, via the
  `wslwebservices.leg.wa.gov` `GetLegislationAffectingRcwCite` SOAP service
  (XML parsed with fast-xml-parser); defaults to the current biennium.
- Cross-cutting `http.ts` (User-Agent, timeout, normalized errors, SOAP POST)
  and `cache.ts` (TTL cache).
- `scripts/smoke.ts` (direct tool test) and `scripts/mcpcheck.ts` (MCP client
  handshake test).
- README with setup, `claude mcp add` instructions, and data-source notes.
