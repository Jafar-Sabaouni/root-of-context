import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { translateQuery, ExecutableAction } from "./parser/queryTranslator.js";
import { Indexer } from "./engine/indexer.js";
import fs from "fs/promises";
import { join } from "path";

const server = new Server(
  {
    name: "root-of-context",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

let indexer: Indexer;

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "query_codebase_context",
        description:
          'Use this tool to safely explore the codebase architecture, dependencies, and history before making changes. Provide a chained command using `target("file").blast_radius()` or `search("concept").depends_on()`.',
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The chained command query string.",
            },
          },
          required: ["query"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "query_codebase_context") {
    throw new McpError(
      ErrorCode.MethodNotFound,
      `Unknown tool: ${request.params.name}`,
    );
  }

  const { query } = request.params.arguments as { query: unknown };

  if (typeof query !== "string") {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Invalid or missing 'query' argument",
    );
  }

  try {
    const actions = translateQuery(query);
    const results: string[] = [];

    if (!indexer) {
      indexer = new Indexer(process.cwd());
      await indexer.init();
      await indexer.indexWorkspace();
    }

    const embeddings = indexer.getEmbeddings();
    const git = indexer.getGit();

    for (const action of actions) {
      if (action.action === "blast_radius" && action.target) {
        const targetStr = action.target;
        results.push(`[Blast Radius for ${targetStr}]`);
        try {
          const potential = await embeddings.search(targetStr, 50);
          const affected = potential.filter((p: any) => {
            if (p.imports) {
              try {
                const imp = JSON.parse(p.imports);
                return (
                  imp.includes(targetStr) ||
                  imp.some((i: string) => i.includes(targetStr))
                );
              } catch {
                return false;
              }
            }
            return false;
          });
          if (affected.length === 0) {
            results.push(`No dependents found matching ${targetStr}`);
          } else {
            affected.forEach((a) => results.push(`- ${a.file}`));
          }
        } catch (e) {
          results.push(`Failed to calculate blast radius for ${targetStr}`);
        }
      } else if (action.action === "depends_on" && action.search) {
        results.push(`[Dependencies for concept: ${action.search}]`);
        try {
          const matches = await embeddings.search(action.search, 3);
          for (const match of matches) {
            results.push(`File: ${match.file}`);
            if ((match as any).imports) {
              try {
                const imp = JSON.parse((match as any).imports);
                results.push(`  Imports: ${imp.join(", ")}`);
              } catch {}
            }
          }
        } catch (e) {
          results.push(`Search failed for ${action.search}`);
        }
      } else if (action.action === "history" && action.target) {
        results.push(`[Git History for ${action.target}]`);
        const commits = await git.getFileHistory(
          action.target,
          action.limit || 5,
        );
        if (commits.length === 0) {
          results.push("No history found (or not a git repo).");
        } else {
          for (const commit of commits) {
            results.push(
              `Commit: ${commit.hash.substring(0, 7)} | Date: ${commit.date} | Author: ${commit.author_name}`,
            );
            results.push(`Message: ${commit.message}`);
            if (commit.diff) {
              const truncated =
                commit.diff.length > 500
                  ? commit.diff.substring(0, 500) + "...\n[Diff truncated]"
                  : commit.diff;
              results.push(`Diff:\n${truncated}`);
            }
            results.push("---");
          }
        }
      } else {
        results.push(
          `Unknown or unhandled action: ${action.action} with target=${action.target} search=${action.search}`,
        );
      }
    }

    return {
      content: [
        {
          type: "text",
          text: results.join("\n"),
        },
      ],
    };
  } catch (error: any) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Error executing query: ${error.message}`,
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("root-of-context MCP server running on stdio");
}

main().catch((error) => {
  console.error("Error starting server:", error);
  process.exit(1);
});
