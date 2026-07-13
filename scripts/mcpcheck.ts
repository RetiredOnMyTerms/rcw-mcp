// Verifies the MCP protocol layer: spawns src/index.ts over stdio using the MCP
// client SDK, lists tools, and calls get_section. Run: npx tsx scripts/mcpcheck.ts

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main(): Promise<void> {
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "src/index.ts"],
  });
  const client = new Client({ name: "mcpcheck", version: "0.0.1" });
  await client.connect(transport);

  const tools = await client.listTools();
  console.log("Tools:", tools.tools.map((t) => t.name).join(", "));

  const res = await client.callTool({
    name: "get_section",
    arguments: { cite: "42.56.070" },
  });
  const first = (res.content as { type: string; text?: string }[])[0];
  console.log("\nget_section 42.56.070 (first 300 chars):");
  console.log((first?.text ?? "(no text)").slice(0, 300));

  await client.close();
  console.log("\nMCP check complete.");
}

main().catch((err) => {
  console.error("MCP CHECK FAILED:", err);
  process.exit(1);
});
