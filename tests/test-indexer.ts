import { Indexer } from "../src/engine/indexer.js";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import assert from "assert";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function run() {
  console.log("Testing Indexer on a dummy workspace...");
  const workspacePath = join(__dirname, "../tests/dummy-workspace");

  await fs.mkdir(workspacePath, { recursive: true });
  await fs.writeFile(
    join(workspacePath, "auth.ts"),
    "import { User } from './user';\nexport function login() { return true; }",
  );
  await fs.writeFile(
    join(workspacePath, "user.ts"),
    "export class User { id: string; }",
  );

  const indexer = new Indexer(workspacePath);
  await indexer.init();
  console.log("Indexer initialized. Scanning workspace...");

  await indexer.indexWorkspace();
  console.log("Verifying data in VectorDB...");
  const embeddings = indexer.getEmbeddings();
  const searchResults = await embeddings.search("login", 5);
  assert.ok(searchResults.length > 0, "Should have indexed files");
  await fs.rm(workspacePath, { recursive: true, force: true });
  console.log("Indexer tests passed!");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
