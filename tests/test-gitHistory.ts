import { GitEngine } from "../src/engine/gitHistory.js";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import assert from "assert";
import {
  parseQueryString,
  translateQuery,
} from "../src/parser/queryTranslator.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function run() {
  console.log("Testing translateQuery for history limit...");
  const translateAction = translateQuery('target("auth.ts").history(2)');
  assert.strictEqual(translateAction[0].action, "history");
  assert.strictEqual(translateAction[0].target, "auth.ts");
  assert.strictEqual(translateAction[0].limit, 2);

  console.log("Testing GitEngine...");

  const rootPath = join(__dirname, "../");
  const gitEngine = new GitEngine(rootPath);
  const isRepo = await gitEngine.isGitRepo();
  assert.ok(isRepo, "Should run inside a git repository");
  const history = await gitEngine.getFileHistory("README.md", 2);

  assert.ok(Array.isArray(history), "History should be an array");

  if (history.length > 0) {
    assert.ok(history[0].hash, "Commit should have a hash");
    assert.ok(history[0].message, "Commit should have a message");
    assert.ok(history[0].diff, "Commit should include a diff");
    assert.ok(history.length <= 2, "Should respect the limit parameter");

    console.log("Found history size:", history.length);
    console.log("Last commit diff preview:");
    console.log(history[0].diff.substring(0, 200) + "...");
  } else {
    console.log(
      "No git history found for README.md. This is expected if it wasn't committed.",
    );
  }

  console.log("All GitEngine tests passed!");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
