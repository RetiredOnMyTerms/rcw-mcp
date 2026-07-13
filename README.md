# chaimp-mcp-rcw

A small **Model Context Protocol (MCP)** server for the **Revised Code of Washington
(RCW)** — Washington State statutes. Built as a learning project: a stdio MCP server in
TypeScript that Claude Code (or any MCP client) can call.

## Tools

| Tool | What it does | Source |
|------|--------------|--------|
| `get_section` | Full text of an RCW section by cite (e.g. `9A.36.021`) — caption, statutory text, history/notes | scrapes `app.leg.wa.gov/RCW` HTML |
| `search` | Find RCW **citations** matching a partial cite (e.g. `9A.36` → `9A.36.011`, `9A.36.021`, …) | `lawdoccitelookup.leg.wa.gov` JSON API |
| `cite_affected` | Bills in a biennium that amend/affect a cite | `wslwebservices.leg.wa.gov` SOAP service |

### Note on `search`
Washington exposes **no public full-text RCW search API**. `search` matches
**citations**, not keywords — `"assault"` returns nothing, `"9A.36"` returns the
sections in that chapter. Use it to discover cites, then pass them to `get_section`.

## Data sources (all public, read-only, no keys)

- Section text: `https://app.leg.wa.gov/RCW/default.aspx?cite=<CITE>` (HTML, parsed with cheerio)
- Cite lookup: `https://lawdoccitelookup.leg.wa.gov/v1/rcw/<query>/<limit>` (JSON)
- Affecting bills: `https://wslwebservices.leg.wa.gov/rcwciteaffectedservice.asmx`
  operation `GetLegislationAffectingRcwCite` (SOAP 1.1)

## Setup

```sh
git clone https://github.com/RetiredOnMyTerms/rcw-mcp.git
cd rcw-mcp
npm install
npm run typecheck     # tsc --noEmit
npm run smoke         # hit all three data sources, print results
```

## Add to Claude Code

Run these **from the repo root** — `$(pwd)` / `$(Get-Location)` fills in the
absolute path, so nothing is machine-specific.

Run source directly with tsx (no build step):

```sh
# macOS / Linux / Git Bash
claude mcp add rcw --scope user -- npx tsx "$(pwd)/src/index.ts"
```
```powershell
# Windows PowerShell
claude mcp add rcw --scope user -- npx tsx "$(Get-Location)\src\index.ts"
```

Or build and point at the compiled output:

```sh
npm run build
claude mcp add rcw --scope user -- node "$(pwd)/dist/index.js"
```

See [INSTALL.md](INSTALL.md) for full details and other MCP clients.

Then in a Claude Code session:

- "Get RCW 9A.36.021" → `get_section`
- "What RCW sections are in chapter 42.56?" → `search`
- "What bills in 2007-08 affected RCW 9A.36.021?" → `cite_affected`

## Inspect standalone

```sh
npm run inspector     # opens the MCP Inspector against the server
```

## Layout

```
src/
  index.ts            MCP bootstrap: registers the 3 tools, stdio transport
  http.ts             fetch wrapper (User-Agent, timeout, normalized errors, SOAP POST)
  cache.ts            in-memory TTL cache
  tools/
    getSection.ts     scrape + parse a section page (cheerio)
    search.ts         cite-lookup JSON client
    citeAffected.ts   SOAP call + XML parse (fast-xml-parser)
scripts/
  smoke.ts            direct end-to-end test of all three tools
```

## Notes / limitations

- Scraper selectors track the current `app.leg.wa.gov` markup; if the site changes,
  `get_section` returns an honest error rather than garbage.
- `get_section` caches parsed sections in memory for 1 hour (process lifetime).
- All statute content is © the State of Washington; this tool only fetches and formats
  public pages.
