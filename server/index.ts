import express from "express";
import { SqliteCache } from "./cache/sqliteCache";
import { serverConfig } from "./config";
import { LiveFixtureService } from "./services/liveFixtureService";
import { TeamDossierService } from "./services/teamDossierService";

const app = express();
const cache = new SqliteCache(serverConfig.cacheDbPath);
await cache.init();

const fixtures = new LiveFixtureService({ cache });
const teams = new TeamDossierService({ cache });

app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    cache: "sqlite",
    apiFootballConfigured: Boolean(serverConfig.apiFootballKey),
    oddsApiConfigured: Boolean(serverConfig.oddsApiKey)
  });
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

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error);
  response.status(500).json({ error: "Unexpected server error" });
});

app.listen(serverConfig.port, () => {
  console.log(`EdgeFinder API listening on http://127.0.0.1:${serverConfig.port}`);
});

function numberQuery(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
