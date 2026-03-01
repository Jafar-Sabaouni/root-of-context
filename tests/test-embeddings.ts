import { EmbeddingsEngine } from "../src/engine/embeddings.js";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import assert from "assert";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function run() {
  console.log(
    "Testing EmbeddingsEngine initialization (this takes time to download the model the first run)...",
  );
  const dbPath = join(__dirname, "../.test-root-index");
  try {
    await fs.rm(dbPath, { recursive: true, force: true });
  } catch (e) {}

  const engine = new EmbeddingsEngine();
  await engine.init(dbPath);
  console.log("Engine initialized successfully.");

  const testFiles = [
    {
      file: "auth.ts",
      content:
        "function login(user, pass) { return true; } export const auth = true;",
    },
    {
      file: "database.ts",
      content: "class Database { connect() {} executeQuery() {} }",
    },
    {
      file: "ui.tsx",
      content:
        "export function UIComponent() { return <button>Click</button> }",
    },
  ];

  console.log("Storing test files...");
  await engine.storeFiles(testFiles);
  console.log("Files stored successfully.");

  console.log("Testing semantic search for 'user authentication'...");
  const authResults = await engine.search("user authentication", 2);
  console.log(
    "Auth Results:",
    authResults.map((r) => ({ file: r.file, dist: r._distance })),
  );

  assert.ok(authResults.length > 0, "Should have results");
  assert.strictEqual(
    authResults[0].file,
    "auth.ts",
    "auth.ts should be the closest match",
  );
  console.log("Search for 'user authentication' passed.");

  console.log("Testing semantic search for 'UI component'...");
  const uiResults = await engine.search("UI component", 2);
  console.log(
    "UI Results:",
    uiResults.map((r) => ({ file: r.file, dist: r._distance })),
  );
  assert.strictEqual(
    uiResults[0].file,
    "ui.tsx",
    "ui.tsx should be the closest match",
  );
  console.log("Search for 'UI component' passed.");
  console.log("All EmbeddingsEngine tests passed!");
  await fs.rm(dbPath, { recursive: true, force: true });
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
