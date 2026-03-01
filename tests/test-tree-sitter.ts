import { ASTEngine } from "../src/engine/treeSitter.js";
import assert from "assert";

async function run() {
  console.log("Testing ASTEngine initialization...");
  const engine = new ASTEngine();
  await engine.init();
  console.log("ASTEngine initialized successfully.");

  console.log("Testing parsing TypeScript...");
  const tsCode = `
import { Parser } from "web-tree-sitter";
import * as path from 'path';

export const ASTEngine = class {};
export * from "./other-module";
  `;

  const tree = engine.parse(tsCode, "ts");
  assert.ok(tree, "Tree should not be null");

  const deps = engine.extractDependencies(tree);

  assert.deepStrictEqual(deps.imports, ["web-tree-sitter", "path"]);
  assert.deepStrictEqual(deps.exports, ["./other-module"]);

  console.log("Dependencies extraction passed.");

  console.log("Testing JavaScript parsing...");
  const jsCode = `
    const x = require('fs');
    import { z } from 'y';
  `;
  const jsTree = engine.parse(jsCode, "js");
  const jsDeps = engine.extractDependencies(jsTree);
  assert.deepStrictEqual(jsDeps.imports, ["y"]);

  console.log("JS Parsing passed.");
  console.log("All treeSitter tests passed.");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
