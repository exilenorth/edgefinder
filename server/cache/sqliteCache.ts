import fs from "node:fs";
import path from "node:path";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";

interface CacheRow {
  value_json: string;
  expires_at: number;
}

interface ArchiveRow {
  value_json: string;
  completeness: string;
}

export class SqliteCache {
  private database?: Database;
  private sql?: SqlJsStatic;

  constructor(private readonly dbPath: string) {}

  async init() {
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    this.sql = await initSqlJs();
    this.database = fs.existsSync(this.dbPath)
      ? new this.sql.Database(fs.readFileSync(this.dbPath))
      : new this.sql.Database();

    this.database.run(`
      CREATE TABLE IF NOT EXISTS response_cache (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        saved_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )
    `);
    this.database.run(`
      CREATE TABLE IF NOT EXISTS historical_archive (
        key TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        value_json TEXT NOT NULL,
        completeness TEXT NOT NULL,
        archived_at INTEGER NOT NULL
      )
    `);
    this.persist();
  }

  async getOrSet<T>(
    key: string,
    ttlMs: number,
    fetchFresh: () => Promise<T>
  ): Promise<{ value: T; source: "cache" | "live" }> {
    const cached = this.get<T>(key);
    if (cached) {
      return { value: cached, source: "cache" };
    }

    const value = await fetchFresh();
    this.set(key, value, ttlMs);
    return { value, source: "live" };
  }

  get<T>(key: string): T | undefined {
    const db = this.assertDatabase();
    const statement = db.prepare("SELECT value_json, expires_at FROM response_cache WHERE key = ?");
    statement.bind([key]);
    const row = statement.step() ? (statement.getAsObject() as unknown as CacheRow) : undefined;
    statement.free();

    if (!row) return undefined;
    if (row.expires_at <= Date.now()) {
      this.delete(key);
      return undefined;
    }

    return JSON.parse(row.value_json) as T;
  }

  set<T>(key: string, value: T, ttlMs: number) {
    const db = this.assertDatabase();
    const now = Date.now();
    db.run(
      "INSERT OR REPLACE INTO response_cache (key, value_json, saved_at, expires_at) VALUES (?, ?, ?, ?)",
      [key, JSON.stringify(value), now, now + ttlMs]
    );
    this.persist();
  }

  delete(key: string) {
    this.assertDatabase().run("DELETE FROM response_cache WHERE key = ?", [key]);
    this.persist();
  }

  getHistoricalArchive<T>(key: string, requiredCompleteness = "complete"): T | undefined {
    const db = this.assertDatabase();
    const statement = db.prepare("SELECT value_json, completeness FROM historical_archive WHERE key = ?");
    statement.bind([key]);
    const row = statement.step() ? (statement.getAsObject() as unknown as ArchiveRow) : undefined;
    statement.free();

    if (!row || row.completeness !== requiredCompleteness) return undefined;
    return JSON.parse(row.value_json) as T;
  }

  setHistoricalArchive<T>(key: string, kind: string, value: T, completeness: "complete" | "partial") {
    const db = this.assertDatabase();
    db.run(
      "INSERT OR REPLACE INTO historical_archive (key, kind, value_json, completeness, archived_at) VALUES (?, ?, ?, ?, ?)",
      [key, kind, JSON.stringify(value), completeness, Date.now()]
    );
    this.persist();
  }

  private persist() {
    const db = this.assertDatabase();
    fs.writeFileSync(this.dbPath, Buffer.from(db.export()));
  }

  private assertDatabase() {
    if (!this.database) {
      throw new Error("SQLite cache has not been initialised");
    }
    return this.database;
  }
}
