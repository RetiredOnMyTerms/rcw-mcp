# Installing & Using the RCW MCP Server

MCP server for the **Revised Code of Washington** — exposes `get_section`,
`search`, and `cite_affected` to any MCP client (Claude Code, Claude Desktop).

## Prerequisites

- **Node.js 18+** (uses global `fetch`)
- **Claude Code** (or another MCP client)
- Repo at `c:\zedcode\chaimp-mcp-rcw`

## 1. Install dependencies

```sh
cd c:\zedcode\chaimp-mcp-rcw
npm install
```

## 2. Verify it works (optional but recommended)

```sh
npm run typecheck             # tsc, no errors
npm run smoke                 # calls all 3 live data sources, prints results
npx tsx scripts/mcpcheck.ts   # spawns the server, lists + calls tools over MCP
```

## 3. Register with Claude Code

**Run from source (no build step, easiest):**

```sh
claude mcp add rcw --scope user -- npx tsx c:/zedcode/chaimp-mcp-rcw/src/index.ts
```

**Or build once and run compiled JS (faster startup):**

```sh
npm run build
claude mcp add rcw --scope user -- node c:/zedcode/chaimp-mcp-rcw/dist/index.js
```

Scopes: `--scope user` = available in every project. Use `--scope local`
(default) to limit it to the current directory, or `--scope project` to share
it via a checked-in `.mcp.json`.

Confirm it connected:

```sh
claude mcp list        # look for:  rcw: ... - ✔ Connected
```

> **Restart your Claude Code session** after adding — tools load at session
> start, so a session opened before registering won't see them.

## 4. Use it

Just ask in natural language; Claude picks the tool:

| Ask | Tool | Example |
|-----|------|---------|
| Get a statute's text | `get_section` | "Get RCW 9A.36.021" |
| Find cites in a chapter/title | `search` | "List RCW sections in chapter 42.56" |
| Bills that changed a statute | `cite_affected` | "What bills in 2007-08 affected RCW 9A.36.021?" |

### Tool reference

- **`get_section`** — `cite` (e.g. `9A.36.021`). Returns caption + full text +
  history/notes. Cached 1h in memory.
- **`search`** — `query` (partial cite like `9A.36`), optional `limit` (1–25,
  default 10). **Matches citations, not keywords** — `"assault"` returns
  nothing; there is no public full-text RCW search API.
- **`cite_affected`** — `cite`, optional `biennium` (`"2025-26"`; defaults to
  current). Returns bills amending/affecting that cite.

## Managing the server

```sh
claude mcp get rcw       # show config
claude mcp remove rcw    # unregister
```

## Other MCP clients (e.g. Claude Desktop)

Add to the client's MCP config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "rcw": {
      "command": "npx",
      "args": ["tsx", "c:/zedcode/chaimp-mcp-rcw/src/index.ts"]
    }
  }
}
```

## Troubleshooting

- **Not `✔ Connected`** → run `npm install` in the repo; check the path in the
  add command is correct.
- **Tools missing in session** → restart the session (tools load at startup).
- **A tool errors** → data source may be down or markup changed; run
  `npm run smoke` to isolate which of the three sources failed.
