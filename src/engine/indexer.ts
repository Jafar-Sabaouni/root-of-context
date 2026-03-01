import { EmbeddingsEngine, VectorRecord } from "./embeddings.js";
import { ASTEngine } from "./treeSitter.js";
import { GitEngine } from "./gitHistory.js";
import { join, extname } from "path";
import fs from "fs/promises";

export interface IndexerRecord {
  file: string;
  content: string;
  imports: string[];
  exports: string[];
  lastModified?: number;
}

export class Indexer {
  private embeddings = new EmbeddingsEngine();
  private ast = new ASTEngine();
  private git: GitEngine;
  private dbPath: string;

  constructor(private workspacePath: string) {
    this.dbPath = join(workspacePath, ".root-index");
    this.git = new GitEngine(workspacePath);
  }

  async init() {
    await fs.mkdir(this.dbPath, { recursive: true });
    await this.embeddings.init(this.dbPath);
    await this.ast.init();
  }

  private async getFiles(
    dir: string,
    fileList: string[] = [],
  ): Promise<string[]> {
    const skipDirs = new Set([".git", "node_modules", ".root-index", "dist"]);

    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return fileList;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) {
          await this.getFiles(join(dir, entry.name), fileList);
        }
      } else {
        const ext = extname(entry.name);
        if ([".js", ".jsx", ".ts", ".tsx"].includes(ext)) {
          fileList.push(join(dir, entry.name));
        }
      }
    }
    return fileList;
  }

  async indexWorkspace() {
    console.log(`Scanning workspace: ${this.workspacePath}`);
    const files = await this.getFiles(this.workspacePath);
    console.log(`Found ${files.length} code files.`);

    const records: IndexerRecord[] = [];
    for (const absolutePath of files) {
      const relativePath = absolutePath.replace(this.workspacePath + "/", "");

      try {
        const stat = await fs.stat(absolutePath);
        const content = await fs.readFile(absolutePath, "utf-8");

        let imports: string[] = [];
        let exports: string[] = [];
        let ext = extname(relativePath).slice(1) as "ts" | "js" | "tsx" | "jsx";

        try {
          if (ext === "tsx") ext = "tsx";
          else if (ext === "jsx") ext = "js";

          const tree = this.ast.parse(content, ext as any);
          const deps = this.ast.extractDependencies(tree);
          imports = deps.imports;
          exports = deps.exports;
        } catch (e) {
        }

        records.push({
          file: relativePath,
          content,
          imports,
          exports,
          lastModified: stat.mtimeMs,
        });
      } catch (err) {
      }
    }

    if (records.length > 0) {
      const serialized = records.map((r) => ({
        file: r.file,
        content: r.content,
        imports: JSON.stringify(r.imports),
        exports: JSON.stringify(r.exports),
        lastModified: r.lastModified ?? 0,
      }));
      await this.embeddings.storeFiles(serialized);
    }

    console.log(`Indexing complete. Processed ${records.length} files.`);
  }

  getEmbeddings() {
    return this.embeddings;
  }

  getGit() {
    return this.git;
  }

  async getFileDeps(
    file: string,
  ): Promise<{ imports: string[]; exports: string[] } | null> {
    return null;
  }
}
