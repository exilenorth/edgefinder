import fs from "node:fs";
import path from "node:path";
import initSqlJs, { type Database } from "sql.js";
import type { AuditProvider, AuditRequestRecord, AuditRunInput, EndpointSummaryInput, FieldPathSummary } from "./types";

export class AuditDb {
  private constructor(private readonly dbPath: string, private readonly db: Database) {}

  static async open(dbPath: string) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    const SQL = await initSqlJs();
    const db = fs.existsSync(dbPath) ? new SQL.Database(fs.readFileSync(dbPath)) : new SQL.Database();
    const auditDb = new AuditDb(dbPath, db);
    auditDb.migrate();
    return auditDb;
  }

  createRun(input: AuditRunInput) {
    const id = createId("run");
    this.db.run(
      `INSERT INTO api_audit_runs (id, provider, started_at, status, league_id, season, sport_key, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.provider, Date.now(), "running", input.leagueId ?? null, input.season ?? null, input.sportKey ?? null, input.notes ?? null]
    );
    this.save();
    return id;
  }

  finishRun(runId: string, status: "completed" | "failed") {
    this.db.run(`UPDATE api_audit_runs SET finished_at = ?, status = ? WHERE id = ?`, [Date.now(), status, runId]);
    this.save();
  }

  insertRequest(record: AuditRequestRecord) {
    this.db.run(
      `INSERT INTO api_audit_requests (
        id, run_id, provider, endpoint, params_json, status_code, success, error_message, duration_ms, fetched_at, response_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.runId,
        record.provider,
        record.endpoint,
        JSON.stringify(record.params),
        record.statusCode ?? null,
        record.success ? 1 : 0,
        record.errorMessage ?? null,
        record.durationMs,
        record.fetchedAt,
        record.response === undefined ? null : JSON.stringify(record.response)
      ]
    );
  }

  insertFieldPaths(runId: string, provider: AuditProvider, endpoint: string, fieldPaths: FieldPathSummary[]) {
    fieldPaths.forEach((field) => {
      this.db.run(
        `INSERT INTO api_audit_field_paths (
          id, run_id, provider, endpoint, field_path, sample_type, sample_value, occurrence_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          createId("field"),
          runId,
          provider,
          endpoint,
          field.fieldPath,
          field.sampleType,
          field.sampleValue,
          field.occurrenceCount
        ]
      );
    });
  }

  insertEndpointSummary(summary: EndpointSummaryInput) {
    this.db.run(
      `INSERT INTO api_audit_endpoint_summary (
        id, run_id, provider, endpoint, tested, available, result_count, coverage_notes, recommended_use
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        createId("endpoint"),
        summary.runId,
        summary.provider,
        summary.endpoint,
        summary.tested ? 1 : 0,
        summary.available ? 1 : 0,
        summary.resultCount ?? null,
        summary.coverageNotes ?? null,
        summary.recommendedUse ?? null
      ]
    );
  }

  getEndpointSummaries(runId: string) {
    return this.selectAll<{
      provider: string;
      endpoint: string;
      tested: number;
      available: number;
      result_count: number | null;
      coverage_notes: string | null;
      recommended_use: string | null;
    }>(`SELECT provider, endpoint, tested, available, result_count, coverage_notes, recommended_use
       FROM api_audit_endpoint_summary
       WHERE run_id = ?
       ORDER BY provider, endpoint`, [runId]);
  }

  getTopFieldPaths(runId: string, endpoint: string, limit = 80) {
    return this.selectAll<{
      field_path: string;
      sample_type: string;
      sample_value: string;
      occurrence_count: number;
    }>(`SELECT field_path, sample_type, sample_value, SUM(occurrence_count) as occurrence_count
       FROM api_audit_field_paths
       WHERE run_id = ? AND endpoint = ?
       GROUP BY field_path, sample_type, sample_value
       ORDER BY field_path
       LIMIT ?`, [runId, endpoint, limit]);
  }

  getRequests(runId: string) {
    return this.selectAll<{
      endpoint: string;
      success: number;
      status_code: number | null;
      error_message: string | null;
      duration_ms: number;
      params_json: string;
    }>(`SELECT endpoint, success, status_code, error_message, duration_ms, params_json
       FROM api_audit_requests
       WHERE run_id = ?
       ORDER BY fetched_at`, [runId]);
  }

  save() {
    fs.writeFileSync(this.dbPath, Buffer.from(this.db.export()));
  }

  close() {
    this.save();
    this.db.close();
  }

  private migrate() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS api_audit_runs (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        finished_at INTEGER,
        status TEXT NOT NULL,
        league_id INTEGER,
        season INTEGER,
        sport_key TEXT,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS api_audit_requests (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        params_json TEXT NOT NULL,
        status_code INTEGER,
        success INTEGER NOT NULL,
        error_message TEXT,
        duration_ms INTEGER NOT NULL,
        fetched_at INTEGER NOT NULL,
        response_json TEXT
      );

      CREATE TABLE IF NOT EXISTS api_audit_field_paths (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        field_path TEXT NOT NULL,
        sample_type TEXT,
        sample_value TEXT,
        occurrence_count INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS api_audit_endpoint_summary (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        tested INTEGER NOT NULL,
        available INTEGER NOT NULL,
        result_count INTEGER,
        coverage_notes TEXT,
        recommended_use TEXT
      );
    `);
    this.save();
  }

  private selectAll<T>(sql: string, params: Array<string | number>) {
    const statement = this.db.prepare(sql, params);
    const rows: T[] = [];
    while (statement.step()) {
      rows.push(statement.getAsObject() as T);
    }
    statement.free();
    return rows;
  }
}

export function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
