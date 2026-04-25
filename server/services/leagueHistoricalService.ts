import type { LeagueHistoricalDossier } from "../../src/types";
import {
  ApiFootballClient,
  type ApiFootballLeagueRecord,
  type ApiFootballSeasonPlayerRecord,
  type ApiFootballStandingRecord
} from "../../src/providers/apiFootballClient";
import { serverConfig } from "../config";
import { coverageTtl, leagueHistoricalTtl } from "./seasonCachePolicy";

interface LeagueHistoricalServiceDeps {
  cache: {
    getOrSet<T>(key: string, ttlMs: number, fetchFresh: () => Promise<T>): Promise<{ value: T; source: "cache" | "live" }>;
  };
}

export class LeagueHistoricalService {
  private readonly football?: ApiFootballClient;

  constructor(private readonly deps: LeagueHistoricalServiceDeps) {
    this.football = serverConfig.apiFootballKey
      ? new ApiFootballClient(serverConfig.apiFootballKey, { minIntervalMs: serverConfig.apiFootballMinIntervalMs })
      : undefined;
  }

  async getHistoricalDossier(query: { league?: number; season?: number }) {
    const league = query.league ?? serverConfig.apiFootballLeagueId;
    const season = query.season ?? serverConfig.apiFootballSeason;

    return this.deps.cache.getOrSet(
      `league-historical:v1:${league}:${season}`,
      leagueHistoricalTtl(season),
      () => this.fetchHistoricalDossier(league, season)
    );
  }

  private async fetchHistoricalDossier(league: number, season: number): Promise<LeagueHistoricalDossier> {
    const errors: string[] = [];

    if (!this.football) {
      return createUnavailableDossier(league, season, ["API-Football key is not configured."]);
    }

    const coverage = await this.getCoverage(league, season, errors);
    const standings = await capture(errors, "Standings", () =>
      this.football!.getStandings({ league, season }).then((envelope) => envelope.response[0])
    );
    const topScorers = await capture(errors, "Top scorers", () =>
      this.football!.getTopScorers({ league, season }).then((envelope) => envelope.response)
    );
    const topAssists = await capture(errors, "Top assists", () =>
      this.football!.getTopAssists({ league, season }).then((envelope) => envelope.response)
    );

    return {
      league: {
        id: league,
        season,
        name: standings?.league.name ?? coverage?.league.name,
        logo: standings?.league.logo ?? coverage?.league.logo
      },
      coverage: mapCoverage(coverage, season),
      standings: mapStandings(standings),
      topScorers: (topScorers ?? []).slice(0, 20).map(mapTopPlayer),
      topAssists: (topAssists ?? []).slice(0, 20).map(mapTopPlayer),
      dataStatus: {
        source: errors.length === 0 ? "live" : standings || topScorers?.length || topAssists?.length ? "partial" : "unavailable",
        season,
        errors,
        refreshedAt: new Date().toISOString()
      }
    };
  }

  private async getCoverage(league: number, season: number, errors: string[]) {
    const result = await this.deps.cache.getOrSet(
      `league-coverage:v1:${league}:${season}`,
      coverageTtl(season),
      async () => {
        if (!this.football) return undefined;
        return this.football.getLeagues({ id: league, season }).then((envelope) => envelope.response[0]);
      }
    );

    if (!result.value) {
      errors.push("League coverage unavailable.");
    }

    return result.value;
  }
}

async function capture<T>(errors: string[], label: string, run: () => Promise<T>): Promise<T | undefined> {
  try {
    return await run();
  } catch (error) {
    errors.push(`${label} unavailable${error instanceof Error ? `: ${error.message}` : ""}`);
    return undefined;
  }
}

function mapCoverage(record: ApiFootballLeagueRecord | undefined, season: number): LeagueHistoricalDossier["coverage"] {
  const coverage = record?.seasons.find((item) => item.year === season)?.coverage;
  if (!coverage) return undefined;

  return {
    fixtures: {
      events: coverage.fixtures?.events,
      lineups: coverage.fixtures?.lineups,
      statisticsFixtures: coverage.fixtures?.statistics_fixtures,
      statisticsPlayers: coverage.fixtures?.statistics_players
    },
    standings: coverage.standings,
    players: coverage.players,
    topScorers: coverage.top_scorers,
    topAssists: coverage.top_assists,
    injuries: coverage.injuries,
    predictions: coverage.predictions,
    odds: coverage.odds
  };
}

function mapStandings(record: ApiFootballStandingRecord | undefined): LeagueHistoricalDossier["standings"] {
  return (
    record?.league.standings[0]?.map((standing) => ({
      rank: standing.rank,
      teamId: standing.team.id,
      team: standing.team.name,
      logo: standing.team.logo,
      played: standing.all?.played,
      wins: standing.all?.win,
      draws: standing.all?.draw,
      losses: standing.all?.lose,
      goalsFor: standing.all?.goals?.for,
      goalsAgainst: standing.all?.goals?.against,
      goalDifference: standing.goalsDiff,
      points: standing.points,
      form: standing.form
    })) ?? []
  );
}

function mapTopPlayer(record: ApiFootballSeasonPlayerRecord): LeagueHistoricalDossier["topScorers"][number] {
  const stats = record.statistics[0];
  return {
    playerId: record.player.id,
    player: record.player.name,
    team: stats?.team?.name ?? "Unknown",
    photo: record.player.photo,
    goals: stats?.goals?.total,
    assists: stats?.goals?.assists,
    appearances: stats?.games?.appearences,
    minutes: stats?.games?.minutes
  };
}

function createUnavailableDossier(league: number, season: number, errors: string[]): LeagueHistoricalDossier {
  return {
    league: {
      id: league,
      season
    },
    standings: [],
    topScorers: [],
    topAssists: [],
    dataStatus: {
      source: "unavailable",
      season,
      errors,
      refreshedAt: new Date().toISOString()
    }
  };
}
