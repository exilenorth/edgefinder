import { serverConfig } from "../config";
import type { SeasonResearchRepository } from "../repositories/seasonResearchRepository";
import type { LeagueHistoricalService } from "./leagueHistoricalService";
import type { TeamDossierService } from "./teamDossierService";

export interface HistoricalSeasonSyncOptions {
  league?: number;
  season?: number;
  includeTeams?: boolean;
  teamLimit?: number;
}

export interface HistoricalSeasonSyncResult {
  league: number;
  season: number;
  source: "archive" | "cache" | "live";
  teamsRequested: number;
  teamsSynced: number;
  teamFailures: Array<{
    teamId: number;
    team: string;
    error: string;
  }>;
  summary: ReturnType<SeasonResearchRepository["getLeagueSeasonSummary"]>;
}

export class HistoricalSeasonSyncService {
  constructor(
    private readonly deps: {
      leagues: LeagueHistoricalService;
      teams: TeamDossierService;
      seasonResearch: SeasonResearchRepository;
    }
  ) {}

  async syncLeagueSeason(options: HistoricalSeasonSyncOptions = {}): Promise<HistoricalSeasonSyncResult> {
    const league = options.league ?? serverConfig.apiFootballLeagueId;
    const season = options.season ?? serverConfig.apiFootballSeason;
    const includeTeams = options.includeTeams ?? true;
    const teamLimit = sanitizeTeamLimit(options.teamLimit);

    const leagueResult = await this.deps.leagues.getHistoricalDossier({ league, season });
    const standingsTeams = uniqueStandingTeams(leagueResult.value.standings);
    const teamsToSync = includeTeams ? standingsTeams.slice(0, teamLimit ?? standingsTeams.length) : [];
    const teamFailures: HistoricalSeasonSyncResult["teamFailures"] = [];
    let teamsSynced = 0;

    for (const team of teamsToSync) {
      try {
        await this.deps.teams.getTeamDossier(team.teamId, {
          teamName: team.team,
          league,
          season
        });
        teamsSynced += 1;
      } catch (error) {
        teamFailures.push({
          teamId: team.teamId,
          team: team.team,
          error: error instanceof Error ? error.message : "Unknown sync error"
        });
      }
    }

    return {
      league,
      season,
      source: leagueResult.source,
      teamsRequested: teamsToSync.length,
      teamsSynced,
      teamFailures,
      summary: this.deps.seasonResearch.getLeagueSeasonSummary(league, season)
    };
  }
}

function sanitizeTeamLimit(teamLimit: number | undefined) {
  if (teamLimit === undefined) return undefined;
  if (!Number.isFinite(teamLimit) || teamLimit <= 0) return undefined;
  return Math.floor(teamLimit);
}

function uniqueStandingTeams(standings: Awaited<ReturnType<LeagueHistoricalService["getHistoricalDossier"]>>["value"]["standings"]) {
  const seen = new Set<number>();
  return standings.filter((standing) => {
    if (seen.has(standing.teamId)) return false;
    seen.add(standing.teamId);
    return true;
  });
}
