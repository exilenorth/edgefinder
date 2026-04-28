import express from "express";
import { SqliteCache } from "./cache/sqliteCache";
import { serverConfig } from "./config";
import { runMigrations } from "./db/migrations";
import { DomainStatsRepository } from "./repositories/domainStatsRepository";
import { FixturesRepository } from "./repositories/fixturesRepository";
import { LeaguesRepository } from "./repositories/leaguesRepository";
import { OddsRepository } from "./repositories/oddsRepository";
import { ProviderRequestsRepository } from "./repositories/providerRequestsRepository";
import { SeasonResearchRepository } from "./repositories/seasonResearchRepository";
import { TeamsRepository } from "./repositories/teamsRepository";
import { HistoricalSeasonSyncService } from "./services/historicalSeasonSyncService";
import { LeagueHistoricalService } from "./services/leagueHistoricalService";
import { LiveFixtureService } from "./services/liveFixtureService";
import { NormalizedFixtureService } from "./services/normalizedFixtureService";
import { TeamDossierService } from "./services/teamDossierService";
import { FixtureSnapshotSync } from "./sync/fixtureSnapshotSync";
import { OddsSnapshotSync } from "./sync/oddsSnapshotSync";

const app = express();
const cache = new SqliteCache(serverConfig.cacheDbPath);
await cache.init();
runMigrations(cache);

const fixtureSync = new FixtureSnapshotSync(cache);
const oddsSync = new OddsSnapshotSync(cache);
const providerRequests = new ProviderRequestsRepository(cache);
const seasonResearch = new SeasonResearchRepository(cache);
const fixtures = new LiveFixtureService({ cache, fixtureSync, oddsSync, providerRequests });
const teams = new TeamDossierService({ cache, seasonResearch });
const leagues = new LeagueHistoricalService({ cache, seasonResearch });
const historicalSeasonSync = new HistoricalSeasonSyncService({ leagues, teams, seasonResearch });
const domainStats = new DomainStatsRepository(cache);
const oddsRepository = new OddsRepository(cache);

const fixturesRepo = new FixturesRepository(cache);
const leaguesRepo = new LeaguesRepository(cache);
const teamsRepo = new TeamsRepository(cache);
const normalizedFixtures = new NormalizedFixtureService({ fixtures: fixturesRepo, leagues: leaguesRepo, teams: teamsRepo });

app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    cache: "sqlite",
    normalizedDb: true,
    apiFootballConfigured: Boolean(serverConfig.apiFootballKey),
    oddsApiConfigured: Boolean(serverConfig.oddsApiKey)
  });
});

app.get("/api/db/summary", (_request, response) => {
  response.json({
    ok: true,
    tables: domainStats.getSummary()
  });
});

app.get("/api/research/league-season/:league/:season/summary", (request, response, next) => {
  try {
    const league = numberParam(request.params.league);
    const season = numberParam(request.params.season);
    if (!league || !season) {
      response.status(400).json({ error: "League and season must be numeric" });
      return;
    }

    response.json({
      ok: true,
      summary: seasonResearch.getLeagueSeasonSummary(league, season)
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/sync/historical-season", async (request, response, next) => {
  try {
    const result = await historicalSeasonSync.syncLeagueSeason({
      league: numberQuery(request.body?.league),
      season: numberQuery(request.body?.season),
      includeTeams: typeof request.body?.includeTeams === "boolean" ? request.body.includeTeams : undefined,
      teamLimit: numberQuery(request.body?.teamLimit)
    });

    response.json({
      ok: true,
      result
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/fixtures", async (_request, response, next) => {
  try {
    const result = await fixtures.listFixtures();
    response.setHeader("x-edgefinder-cache", result.source);
    response.json(result.value);
  } catch (error) {
    next(error);
  }
});

app.get("/api/fixtures/:id", async (request, response, next) => {
  try {
    const result = await fixtures.getFixture(request.params.id);
    if (!result.value) {
      response.status(404).json({ error: "Fixture not found" });
      return;
    }

    response.setHeader("x-edgefinder-cache", result.source);
    response.json(result.value);
  } catch (error) {
    next(error);
  }
});

app.get("/api/fixtures/:id/odds-movement", (request, response, next) => {
  try {
    response.json({
      fixtureId: request.params.id,
      markets: oddsRepository.listFixtureOddsMovement(request.params.id)
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/normalized/fixtures", (_request, response, next) => {
  try {
    const leagueId = typeof _request.query.league === "string" ? _request.query.league : undefined;
    const season = numberQuery(_request.query.season);
    const result = normalizedFixtures.listFixtures({ leagueId, season });
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/api/normalized/fixtures/snapshot", (_request, response, next) => {
  try {
    response.json(normalizedFixtures.getSnapshot());
  } catch (error) {
    next(error);
  }
});

app.get("/api/normalized/fixtures/:id", (request, response, next) => {
  try {
    const result = normalizedFixtures.getFixture(request.params.id);
    if (!result) {
      response.status(404).json({ error: "Fixture not found in normalized store" });
      return;
    }
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/api/normalized/leagues", (_request, response, next) => {
  try {
    response.json(normalizedFixtures.listLeaguesWithFixtures());
  } catch (error) {
    next(error);
  }
});

app.get("/api/normalized/teams", (_request, response, next) => {
  try {
    response.json(normalizedFixtures.listTeamsWithFixtures());
  } catch (error) {
    next(error);
  }
});

app.get("/api/teams/:id/dossier", async (request, response, next) => {
  try {
    const teamId = Number(request.params.id);
    if (!Number.isFinite(teamId)) {
      response.status(400).json({ error: "Team id must be numeric" });
      return;
    }

    const result = await teams.getTeamDossier(teamId, {
      teamName: typeof request.query.name === "string" ? request.query.name : undefined,
      league: numberQuery(request.query.league),
      season: numberQuery(request.query.season)
    });
    response.setHeader("x-edgefinder-cache", result.source);
    response.json(result.value);
  } catch (error) {
    next(error);
  }
});

app.get("/api/leagues/:id/historical", async (request, response, next) => {
  try {
    const leagueId = Number(request.params.id);
    if (!Number.isFinite(leagueId)) {
      response.status(400).json({ error: "League id must be numeric" });
      return;
    }

    const result = await leagues.getHistoricalDossier({
      league: leagueId,
      season: numberQuery(request.query.season)
    });
    response.setHeader("x-edgefinder-cache", result.source);
    response.json(result.value);
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error);
  response.status(500).json({ error: "Unexpected server error" });
});

app.listen(serverConfig.port, () => {
  console.log(`EdgeFinder API listening on http://127.0.0.1:${serverConfig.port}`);
});

function numberQuery(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function numberParam(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
