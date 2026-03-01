import { pipeline, env } from "@xenova/transformers";
import * as vectordb from "vectordb";

env.allowLocalModels = true;

export interface VectorRecord {
  vector: number[];
  file: string;
  content: string;
  imports?: string;
  exports?: string;
  lastModified?: number;
}

export class EmbeddingsEngine {
  private extractor: any = null;
  private db: vectordb.Connection | null = null;
  private table: vectordb.Table | null = null;
  private isInitialized = false;

  async init(dbPath: string) {
    if (this.isInitialized) return;
    this.extractor = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
      { quantized: true },
    );
    this.db = await vectordb.connect(dbPath);

    const tableNames = await this.db.tableNames();
    if (tableNames.includes("codebase")) {
      this.table = await this.db.openTable("codebase");
    } else {

      const dummyVector = Array.from({ length: 384 }, () => 0.0);
      this.table = await this.db.createTable("codebase", [
        {
          vector: dummyVector,
          file: "init_schema",
          content: "schema_enforcement",
          imports: "[]",
          exports: "[]",
          lastModified: 0,
        },
      ]);
      await this.table.delete("file = 'init_schema'");
    }

    this.isInitialized = true;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.extractor) throw new Error("EmbeddingsEngine not initialized");
    const output = await this.extractor(text, {
      pooling: "mean",
      normalize: true,
    });
    return Array.from(output.data);
  }

  async storeFiles(
    records: {
      file: string;
      content: string;
      imports?: string;
      exports?: string;
      lastModified?: number;
    }[],
  ) {
    if (!this.table) throw new Error("EmbeddingsEngine table not initialized");
    if (records.length === 0) return;
    const vRecords: VectorRecord[] = [];
    for (const record of records) {
      const vector = await this.generateEmbedding(record.content);
      vRecords.push({
        vector,
        file: record.file,
        content: record.content,
        imports: record.imports,
        exports: record.exports,
        lastModified: record.lastModified,
      });
    }
    await this.table.add(vRecords as any);
  }

  async search(concept: string, limit: number = 5) {
    if (!this.table) throw new Error("EmbeddingsEngine table not initialized");

    const queryVector = await this.generateEmbedding(concept);
    const results = await this.table.search(queryVector).limit(limit).execute();
    return results;
  }
}
