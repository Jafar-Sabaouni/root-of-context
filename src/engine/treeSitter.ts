import { createRequire } from "module";
const require = createRequire(import.meta.url);
const webTreeSitter = require("web-tree-sitter");
const Parser = webTreeSitter.Parser || webTreeSitter;
const Language = webTreeSitter.Language;
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const wasmDir = join(__dirname, "../../src/wasm");

export class ASTEngine {
  private parser: any = null;
  private languages: Record<string, any> = {};

  async init() {
    if (this.parser) return;
    await Parser.init({
      locateFile() {
        return join(wasmDir, "web-tree-sitter.wasm");
      },
    });

    this.parser = new Parser();

    const tsPath = join(wasmDir, "tree-sitter-typescript.wasm");
    const tsxPath = join(wasmDir, "tree-sitter-tsx.wasm");
    const jsPath = join(wasmDir, "tree-sitter-javascript.wasm");

    try {
      this.languages["ts"] = await Language.load(tsPath);
      this.languages["tsx"] = await Language.load(tsxPath);
      this.languages["js"] = await Language.load(jsPath);
    } catch (error) {
      console.warn("Failed to load some languages:", error);
    }
  }

  parse(code: string, extension: "ts" | "tsx" | "js"): any {
    if (!this.parser) {
      throw new Error("ASTEngine is not initialized. Call init() first.");
    }

    const language = this.languages[extension] || this.languages["ts"];
    if (!language) {
      throw new Error(`Language grammar for ${extension} is not available.`);
    }

    this.parser.setLanguage(language);
    return this.parser.parse(code);
  }

  extractDependencies(tree: any): {
    imports: string[];
    exports: string[];
  } {
    const imports: string[] = [];
    const exports: string[] = [];

    const cursor = tree.walk();

    const walk = (c: any) => {
      const type = c.nodeType;

      if (type === "import_statement") {
        const sourceNode = c.currentNode.childForFieldName("source");
        if (sourceNode) {
          const text = sourceNode.text.replace(/['"]/g, "");
          imports.push(text);
        }
      }

      if (type === "export_statement") {
        const sourceNode = c.currentNode.childForFieldName("source");
        if (sourceNode) {
          const text = sourceNode.text.replace(/['"]/g, "");
          exports.push(text);
        }
      }

      if (c.gotoFirstChild()) {
        walk(c);
        c.gotoParent();
      }
      if (c.gotoNextSibling()) {
        walk(c);
      }
    };

    walk(cursor);

    return { imports, exports };
  }
}
