#!/usr/bin/env node
// RCW MCP server — exposes three tools over stdio:
//   get_section    full text of an RCW section by cite
//   search         find RCW citations matching a (partial) cite
//   cite_affected  bills in a biennium that affect a cite (SOAP bonus)
//
// stdio rule: NEVER write to stdout except the MCP protocol itself. Diagnostics
// go to stderr (console.error), never console.log.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { getSection } from "./tools/getSection.js";
import { searchCites } from "./tools/search.js";
import { citeAffected, currentBiennium } from "./tools/citeAffected.js";

type TextResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

function ok(text: string): TextResult {
  return { content: [{ type: "text", text }] };
}

function fail(err: unknown): TextResult {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

const server = new McpServer({ name: "rcw", version: "0.1.0" });

server.registerTool(
  "get_section",
  {
    title: "Get RCW section",
    description:
      "Return the full text of a Revised Code of Washington (RCW) section by " +
      "its citation, e.g. 9A.36.021. Includes the caption, statutory text, and " +
      "history/notes. Source: app.leg.wa.gov.",
    inputSchema: {
      cite: z
        .string()
        .describe("Section-level RCW cite, e.g. 9A.36.021 or 42.56.070"),
    },
  },
  async ({ cite }) => {
    try {
      const s = await getSection(cite);
      return ok(
        `RCW ${s.cite} — ${s.caption}\n${s.url}\n\n${s.text}`,
      );
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  "search",
  {
    title: "Search RCW citations",
    description:
      "Find RCW citations matching a partial citation string (e.g. \"9A.36\" " +
      "-> 9A.36.011, 9A.36.021, ...). NOTE: this matches CITATIONS, not " +
      "keywords — free-text words like \"assault\" return no results, because " +
      "there is no public full-text RCW search API. Feed results into " +
      "get_section.",
    inputSchema: {
      query: z.string().describe('Partial or full RCW cite, e.g. "9A.36"'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(25)
        .optional()
        .describe("Max cites to return (default 10)"),
    },
  },
  async ({ query, limit }) => {
    try {
      const cites = await searchCites(query, limit ?? 10);
      if (cites.length === 0) {
        return ok(
          `No RCW citations matched "${query}". This tool matches citations, ` +
            `not keywords — try a cite prefix like "9A.36" or a title number.`,
        );
      }
      return ok(
        `${cites.length} matching RCW cite(s) for "${query}":\n` +
          cites.map((c) => `  ${c}`).join("\n"),
      );
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  "cite_affected",
  {
    title: "Bills affecting an RCW cite",
    description:
      "List bills in a biennium that amend or affect a given RCW citation, via " +
      "the Washington State Legislature SOAP web service. Biennium format is " +
      `"2025-26" (defaults to the current biennium, ${currentBiennium()}).`,
    inputSchema: {
      cite: z.string().describe("RCW cite, e.g. 9A.36.021 (or a chapter 9A.36)"),
      biennium: z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .optional()
        .describe('Biennium like "2025-26"; defaults to current'),
    },
  },
  async ({ cite, biennium }) => {
    try {
      const { biennium: bien, rcwCite, bills } = await citeAffected(cite, biennium);
      if (bills.length === 0) {
        return ok(`No bills in ${bien} affect RCW ${rcwCite}.`);
      }
      const lines = bills.map((b) => {
        const bits = [b.billId || "(unknown bill)"];
        if (b.type) bits.push(b.type);
        if (b.agency) bits.push(b.agency);
        if (b.active === false) bits.push("inactive");
        return `  ${bits.join(" — ")}`;
      });
      return ok(
        `${bills.length} bill(s) in ${bien} affecting RCW ${rcwCite}:\n` +
          lines.join("\n"),
      );
    } catch (err) {
      return fail(err);
    }
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("rcw MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
