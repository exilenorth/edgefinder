import { SqliteCache } from "../server/cache/sqliteCache";
import { serverConfig } from "../server/config";
import { runMigrations } from "../server/db/migrations";
import { SeasonResearchRepository } from "../server/repositories/seasonResearchRepository";
import { HistoricalSeasonSyncService } from "../server/services/historicalSeasonSyncService";
import { LeagueHistoricalService } from "../server/services/leagueHistoricalService";
import { TeamDossierService } from "../server/services/teamDossierService";

const options = parseArgs(process.argv.slice(2));

const cache = new SqliteCache(serverConfig.cacheDbPath);
await cache.init();
runMigrations(cache);

const seasonResearch = new SeasonResearchRepository(cache);
const leagues = new LeagueHistoricalService({ cache, seasonResearch });
const teams = new TeamDossierService({ cache, seasonResearch });
const sync = new HistoricalSeasonSyncService({ leagues, teams, seasonResearch });

const result = await sync.syncLeagueSeason(options);
console.log(JSON.stringify(result, null, 2));

function parseArgs(args: string[]) {
  const parsed: {
    league?: number;
    season?: number;
    includeTeams?: boolean;
    teamLimit?: number;
  } = {};

  args.forEach((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    if (key === "league") parsed.league = numberValue(value);
    if (key === "season") parsed.season = numberValue(value);
    if (key === "teamLimit") parsed.teamLimit = numberValue(value);
    if (key === "includeTeams") parsed.includeTeams = value !== "false";
  });

  return parsed;
}

function numberValue(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
