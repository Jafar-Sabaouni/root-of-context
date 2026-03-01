import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const serverPath = join(__dirname, "../dist/index.js");
  console.log(`Starting client and spawned server at ${serverPath}`);

  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
  });

  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} },
  );

  await client.connect(transport);
  console.log("Connected to MCP server.");

  const toolsResponse = await client.listTools();
  console.log("Available tools:", JSON.stringify(toolsResponse, null, 2));

  console.log("\nCalling query_codebase_context...");
  const result = await client.callTool({
    name: "query_codebase_context",
    arguments: {
      query: 'target("auth.ts").blast_radius()',
    },
  });
  console.log("Tool result:", JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
