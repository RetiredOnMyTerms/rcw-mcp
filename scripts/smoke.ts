// Standalone smoke test — calls each tool's core function directly (no MCP layer)
// and prints results. Run: npm run smoke
// Confirms the scrapers/SOAP/JSON parsing work before wiring into a client.

import { getSection } from "../src/tools/getSection.js";
import { searchCites } from "../src/tools/search.js";
import { citeAffected } from "../src/tools/citeAffected.js";

function hr(label: string): void {
  console.log(`\n${"=".repeat(70)}\n${label}\n${"=".repeat(70)}`);
}

async function main(): Promise<void> {
  hr("get_section 9A.36.021");
  const section = await getSection("9A.36.021");
  console.log(`cite:    ${section.cite}`);
  console.log(`caption: ${section.caption}`);
  console.log(`url:     ${section.url}`);
  console.log(`text (first 600 chars):\n${section.text.slice(0, 600)}`);

  hr('search "9A.36"');
  console.log(await searchCites("9A.36", 10));

  hr('search "42.56" (Public Records Act)');
  console.log(await searchCites("42.56", 8));

  hr("cite_affected 9A.36.021 (current biennium)");
  const affected = await citeAffected("9A.36.021");
  console.log(`biennium: ${affected.biennium}  bills: ${affected.bills.length}`);
  console.log(affected.bills.slice(0, 10));

  hr("cite_affected 9A.36.021 @ 2007-08 (known amendment year)");
  const historical = await citeAffected("9A.36.021", "2007-08");
  console.log(`biennium: ${historical.biennium}  bills: ${historical.bills.length}`);
  console.log(historical.bills);

  console.log("\nSmoke test complete.");
}

main().catch((err) => {
  console.error("SMOKE FAILED:", err);
  process.exit(1);
});
