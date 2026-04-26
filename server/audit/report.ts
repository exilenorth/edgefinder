import fs from "node:fs";
import path from "node:path";
import type { AuditProvider } from "./types";
import type { AuditDb } from "./auditDb";

export interface ReportOptions {
  runId: string;
  provider: AuditProvider;
  title: string;
  reportDir: string;
  filenameStem: string;
}

export function writeAuditReport(db: AuditDb, options: ReportOptions) {
  fs.mkdirSync(options.reportDir, { recursive: true });

  const summaries = db.getEndpointSummaries(options.runId);
  const requests = db.getRequests(options.runId);
  const lines: string[] = [];

  lines.push(`# ${options.title}`);
  lines.push("");
  lines.push(`Run ID: \`${options.runId}\``);
  lines.push(`Provider: \`${options.provider}\``);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");

  lines.push("## Endpoint summary");
  lines.push("");
  lines.push("| Endpoint | Available | Results | Recommended use | Notes |");
  lines.push("|---|---:|---:|---|---|");
  summaries.forEach((summary) => {
    lines.push(
      `| \`${summary.endpoint}\` | ${summary.available ? "Yes" : "No"} | ${summary.result_count ?? "-"} | ${escapeTable(summary.recommended_use ?? "-")} | ${escapeTable(summary.coverage_notes ?? "-")} |`
    );
  });
  lines.push("");

  lines.push("## Discovered field paths");
  lines.push("");
  summaries
    .filter((summary) => summary.available)
    .forEach((summary) => {
      lines.push(`### \`${summary.endpoint}\``);
      lines.push("");
      const fields = db.getTopFieldPaths(options.runId, summary.endpoint, 120);
      if (fields.length === 0) {
        lines.push("No field paths recorded.");
        lines.push("");
        return;
      }
      lines.push("| Field path | Type | Sample | Count |");
      lines.push("|---|---|---|---:|");
      fields.forEach((field) => {
        lines.push(
          `| \`${field.field_path}\` | ${field.sample_type} | ${escapeTable(field.sample_value)} | ${field.occurrence_count} |`
        );
      });
      lines.push("");
    });

  lines.push("## Request log");
  lines.push("");
  lines.push("| Endpoint | Success | Status | Duration | Params / error |");
  lines.push("|---|---:|---:|---:|---|");
  requests.forEach((request) => {
    const params = request.error_message ? request.error_message : request.params_json;
    lines.push(
      `| \`${request.endpoint}\` | ${request.success ? "Yes" : "No"} | ${request.status_code ?? "-"} | ${request.duration_ms}ms | ${escapeTable(params)} |`
    );
  });
  lines.push("");

  const outputPath = path.join(options.reportDir, `${options.filenameStem}.md`);
  fs.writeFileSync(outputPath, `${lines.join("\n")}\n`);
  return outputPath;
}

function escapeTable(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 240);
}
