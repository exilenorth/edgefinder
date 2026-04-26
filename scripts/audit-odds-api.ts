import path from "node:path";
import dotenv from "dotenv";
import { AuditDb } from "../server/audit/auditDb";
import { extractFieldPaths } from "../server/audit/fieldPathExtractor";
import { auditFetchJson } from "../server/audit/http";
import { writeAuditReport } from "../server/audit/report";
import type { OddsApiAuditOptions } from "../server/audit/types";

const ODDS_API_BASE_URL = "https://api.the-odds-api.com/v4";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
  const options = parseOptions();
  const apiKey = process.env.THE_ODDS_API_KEY ?? process.env.VITE_THE_ODDS_API_KEY;

  if (!apiKey) {
    throw new Error("Missing THE_ODDS_API_KEY or VITE_THE_ODDS_API_KEY in .env.local/.env");
  }

  const db = await AuditDb.open(options.dbPath);
  const runId = db.createRun({
    provider: "the-odds-api",
    sportKey: options.sport,
    notes: `regions=${options.regions}; markets=${options.markets}; bookmakers=${options.bookmakers ?? "all"}; sampleEvents=${options.sampleEvents}`
  });

  const call = createOddsCaller({ apiKey, runId, db });

  try {
    console.log(`Starting The Odds API audit run ${runId}`);
    console.log(`Sport ${options.sport}, regions ${options.regions}, markets ${options.markets}`);

    await call("/sports", {}, "Available sport keys and sport metadata");

    const eventsJson = await call(`/sports/${options.sport}/events`, {}, "Event list for fixture matching");
    const events = Array.isArray(eventsJson) ? eventsJson : [];
    const sampledEvents = events.slice(0, options.sampleEvents);

    await call(`/sports/${options.sport}/odds`, {
      regions: options.regions,
      markets: options.markets,
      bookmakers: options.bookmakers,
      oddsFormat: "decimal",
      dateFormat: "iso"
    }, "Main bookmaker odds feed for configured markets");

    for (const event of sampledEvents) {
      const eventId = typeof event?.id === "string" ? event.id : undefined;
      if (!eventId) continue;
      await call(`/sports/${options.sport}/events/${eventId}/odds`, {
        regions: options.regions,
        markets: options.markets,
        bookmakers: options.bookmakers,
        oddsFormat: "decimal",
        dateFormat: "iso"
      }, "Event-specific odds refresh for selected fixture");
    }

    db.finishRun(runId, "completed");
    const reportPath = writeAuditReport(db, {
      runId,
      provider: "the-odds-api",
      title: `The Odds API Audit — ${options.sport}`,
      reportDir: options.reportDir,
      filenameStem: `the-odds-api-${options.sport}-${runId}`
    });

    db.close();
    console.log(`Audit complete. Report written to ${reportPath}`);
  } catch (error) {
    db.finishRun(runId, "failed");
    db.close();
    throw error;
  }
}

function createOddsCaller(input: { apiKey: string; runId: string; db: AuditDb }) {
  return async function call(endpoint: string, params: Record<string, string | number | boolean | undefined>, recommendedUse: string) {
    console.log(`Testing ${endpoint} ${JSON.stringify(params)}`);
    const { record, json } = await auditFetchJson({
      runId: input.runId,
      provider: "the-odds-api",
      baseUrl: ODDS_API_BASE_URL,
      endpoint,
      params: { apiKey: input.apiKey, ...params },
      redactParams: ["apiKey"]
    });

    input.db.insertRequest(record);

    const resultCount = Array.isArray(json) ? json.length : json && typeof json === "object" ? 1 : undefined;
    const available = Boolean(record.success && (resultCount === undefined || resultCount > 0));

    input.db.insertEndpointSummary({
      runId: input.runId,
      provider: "the-odds-api",
      endpoint,
      tested: true,
      available,
      resultCount,
      recommendedUse
    });

    if (json !== undefined) {
      input.db.insertFieldPaths(input.runId, "the-odds-api", endpoint, extractFieldPaths(json));
    }

    input.db.save();
    return json;
  };
}

function parseOptions(): OddsApiAuditOptions {
  const args = parseArgs(process.argv.slice(2));
  return {
    sport: String(args.sport ?? process.env.ODDS_SPORT ?? process.env.VITE_ODDS_SPORT ?? "soccer_epl"),
    regions: String(args.regions ?? process.env.ODDS_REGIONS ?? process.env.VITE_ODDS_REGIONS ?? "uk,eu"),
    markets: String(args.markets ?? process.env.ODDS_MARKETS ?? process.env.VITE_ODDS_MARKETS ?? "h2h,totals"),
    bookmakers: typeof args.bookmakers === "string" ? args.bookmakers : process.env.ODDS_BOOKMAKERS ?? process.env.VITE_ODDS_BOOKMAKERS,
    sampleEvents: numberArg(args["sample-events"], 3),
    dbPath: String(args.db ?? "data/api-audit.sqlite"),
    reportDir: String(args["report-dir"] ?? "reports/api-audit")
  };
}

function parseArgs(argv: string[]) {
  const result: Record<string, string | boolean> = {};
  argv.forEach((arg) => {
    if (!arg.startsWith("--")) return;
    const [key, value] = arg.slice(2).split("=");
    result[key] = value ?? true;
  });
  return result;
}

function numberArg(value: string | boolean | undefined, fallback: number) {
  if (typeof value !== "string") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
