import path from "node:path";
import dotenv from "dotenv";
import { AuditDb, createId } from "../server/audit/auditDb";
import { extractFieldPaths } from "../server/audit/fieldPathExtractor";
import { auditFetchJson, delay, getEnvelopeResponse, getEnvelopeResultCount, hasApiFootballErrors } from "../server/audit/http";
import { writeAuditReport } from "../server/audit/report";
import type { ApiFootballAuditOptions } from "../server/audit/types";

const API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
  const options = parseOptions();
  const apiKey = process.env.API_FOOTBALL_KEY ?? process.env.VITE_API_FOOTBALL_KEY;

  if (!apiKey) {
    throw new Error("Missing API_FOOTBALL_KEY or VITE_API_FOOTBALL_KEY in .env.local/.env");
  }

  const db = await AuditDb.open(options.dbPath);
  const runId = db.createRun({
    provider: "api-football",
    leagueId: options.league,
    season: options.season,
    notes: `sampleFixtures=${options.sampleFixtures}; maxTeams=${options.maxTeams}; maxPlayerPages=${options.maxPlayerPages}`
  });

  const call = createApiFootballCaller({ apiKey, runId, db, minIntervalMs: options.minIntervalMs });

  try {
    console.log(`Starting API-Football audit run ${runId}`);
    console.log(`League ${options.league}, season ${options.season}`);

    const coverage = await call("/leagues", { id: options.league, season: options.season }, "League metadata and coverage flags");
    const fixturesJson = await call("/fixtures", { league: options.league, season: options.season }, "Fixture list, status, results, teams");
    const fixtures = getEnvelopeResponse<Array<any>>(fixturesJson) ?? [];
    const sampledFixtures = sampleFixtures(fixtures, options.sampleFixtures);
    const sampledTeams = sampleTeams(sampledFixtures, options.maxTeams);

    if (sampledFixtures.length === 0) {
      console.warn("No fixtures returned; fixture-dependent endpoints will be skipped.");
    }

    const firstCompleted = sampledFixtures.find((fixture) => fixture?.goals?.home !== null && fixture?.goals?.away !== null) ?? sampledFixtures[0];
    const firstFixtureId = firstCompleted?.fixture?.id;
    const firstHomeTeamId = firstCompleted?.teams?.home?.id;
    const firstAwayTeamId = firstCompleted?.teams?.away?.id;

    if (firstFixtureId) {
      await call("/fixtures", { id: firstFixtureId }, "Single fixture detail");
      await call("/fixtures/statistics", { fixture: firstFixtureId }, "Team match stats for modelling and post-match review");
      await call("/fixtures/players", { fixture: firstFixtureId }, "Player match stats for player research and process review");
      await call("/fixtures/events", { fixture: firstFixtureId }, "Match timeline events: goals, cards, substitutions, VAR");
      await call("/fixtures/lineups", { fixture: firstFixtureId }, "Confirmed XI and formations");
      await call("/predictions", { fixture: firstFixtureId }, "Optional external second opinion, not core model");
    }

    if (firstHomeTeamId && firstAwayTeamId) {
      await call("/fixtures/headtohead", { h2h: `${firstHomeTeamId}-${firstAwayTeamId}`, last: 10 }, "Head-to-head context");
    }

    for (const teamId of sampledTeams) {
      await call("/teams", { id: teamId }, "Team profile and venue reference data");
      await call("/teams/statistics", { league: options.league, season: options.season, team: teamId }, "Team season statistics");
      await call("/players/squads", { team: teamId }, "Squad list");
      await call("/players", { league: options.league, season: options.season, team: teamId, page: 1 }, "Player season stats page 1");
      for (let page = 2; page <= options.maxPlayerPages; page += 1) {
        await call("/players", { league: options.league, season: options.season, team: teamId, page }, `Player season stats page ${page}`);
      }
      await call("/injuries", { league: options.league, season: options.season, team: teamId }, "Player availability, injuries and suspensions");
      await call("/transfers", { team: teamId }, "Squad churn and transfer context");
    }

    await call("/standings", { league: options.league, season: options.season }, "League table and context");
    await call("/players/topscorers", { league: options.league, season: options.season }, "Top scorers");
    await call("/players/topassists", { league: options.league, season: options.season }, "Top assists");

    db.finishRun(runId, "completed");
    const reportPath = writeAuditReport(db, {
      runId,
      provider: "api-football",
      title: `API-Football Audit — league ${options.league}, season ${options.season}`,
      reportDir: options.reportDir,
      filenameStem: `api-football-${options.league}-${options.season}-${runId}`
    });

    db.close();
    console.log(`Audit complete. Report written to ${reportPath}`);
  } catch (error) {
    db.finishRun(runId, "failed");
    db.close();
    throw error;
  }
}

function createApiFootballCaller(input: { apiKey: string; runId: string; db: AuditDb; minIntervalMs: number }) {
  let lastCallAt = 0;

  return async function call(endpoint: string, params: Record<string, string | number | boolean | undefined>, recommendedUse: string) {
    const elapsed = Date.now() - lastCallAt;
    if (elapsed < input.minIntervalMs) {
      await delay(input.minIntervalMs - elapsed);
    }
    lastCallAt = Date.now();

    console.log(`Testing ${endpoint} ${JSON.stringify(params)}`);
    const { record, json } = await auditFetchJson({
      runId: input.runId,
      provider: "api-football",
      baseUrl: API_FOOTBALL_BASE_URL,
      endpoint,
      params,
      headers: { "x-apisports-key": input.apiKey }
    });

    input.db.insertRequest(record);

    const resultCount = getEnvelopeResultCount(json);
    const available = Boolean(record.success && !hasApiFootballErrors(json) && (resultCount === undefined || resultCount > 0));
    const notes = hasApiFootballErrors(json) ? "API returned errors; inspect raw response in database." : undefined;

    input.db.insertEndpointSummary({
      runId: input.runId,
      provider: "api-football",
      endpoint,
      tested: true,
      available,
      resultCount,
      coverageNotes: notes,
      recommendedUse
    });

    if (json !== undefined) {
      input.db.insertFieldPaths(input.runId, "api-football", endpoint, extractFieldPaths(json));
    }

    input.db.save();
    return json;
  };
}

function sampleFixtures(fixtures: Array<any>, requested: number) {
  const completed = fixtures.filter((fixture) => fixture?.goals?.home !== null && fixture?.goals?.away !== null);
  const upcoming = fixtures.filter((fixture) => fixture?.goals?.home === null || fixture?.goals?.away === null);
  const selected = [...completed.slice(0, Math.ceil(requested / 2)), ...upcoming.slice(0, Math.floor(requested / 2))];
  const fallback = fixtures.slice(0, requested);
  return uniqueById(selected.length > 0 ? selected : fallback).slice(0, requested);
}

function sampleTeams(fixtures: Array<any>, maxTeams: number) {
  const teamIds = fixtures.flatMap((fixture) => [fixture?.teams?.home?.id, fixture?.teams?.away?.id]).filter((id): id is number => typeof id === "number");
  return [...new Set(teamIds)].slice(0, maxTeams);
}

function uniqueById(fixtures: Array<any>) {
  const seen = new Set<number>();
  return fixtures.filter((fixture) => {
    const id = fixture?.fixture?.id;
    if (typeof id !== "number" || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function parseOptions(): ApiFootballAuditOptions {
  const args = parseArgs(process.argv.slice(2));
  return {
    league: numberArg(args.league, numberEnv("API_FOOTBALL_LEAGUE_ID", numberEnv("VITE_API_FOOTBALL_LEAGUE_ID", 39))),
    season: numberArg(args.season, numberEnv("API_FOOTBALL_SEASON", numberEnv("VITE_API_FOOTBALL_SEASON", 2025))),
    sampleFixtures: numberArg(args["sample-fixtures"], 10),
    maxTeams: numberArg(args["max-teams"], 4),
    maxPlayerPages: numberArg(args["max-player-pages"], 1),
    minIntervalMs: numberArg(args["min-interval-ms"], numberEnv("API_FOOTBALL_MIN_INTERVAL_MS", 6500)),
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

function numberEnv(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
