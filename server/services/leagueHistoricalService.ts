import type { LeagueHistoricalDossier } from "../../src/types";
import {
  ApiFootballClient,
  type ApiFootballLeagueRecord,
  type ApiFootballSeasonPlayerRecord,
  type ApiFootballStandingRecord
} from "../../src/providers/apiFootballClient";
import { serverConfig } from "../config";
import { coverageTtl, isCompletedSeason, leagueHistoricalTtl } from "./seasonCachePolicy";

interface LeagueHistoricalServiceDeps {
  cache: {
    getOrSet<T>(key: string, ttlMs: number, fetchFresh: () => Promise<T>): Promise<{ value: T; source: "cache" | "live" }>;
    getHistoricalArchive<T>(key: string): T | undefined;
    setHistoricalArchive<T>(key: string, kind: string, value: T, completeness: "complete" | "partial"): void;
  };
  seasonResearch?: {
    upsertLeagueHistoricalDossier(dossier: LeagueHistoricalDossier): void;
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
    const archiveKey = `league-season-contract-v1:${league}:season:${season}`;

    if (isCompletedSeason(season)) {
      const archived = this.deps.cache.getHistoricalArchive<LeagueHistoricalDossier>(archiveKey);
      if (archived) {
        this.deps.seasonResearch?.upsertLeagueHistoricalDossier(archived);
        return { value: archived, source: "archive" as const };
      }
    }

    const result = await this.deps.cache.getOrSet(
      `league-historical:v3:${league}:${season}`,
      leagueHistoricalTtl(season),
      () => this.fetchHistoricalDossier(league, season)
    );

    if (isCompletedSeason(season)) {
      const completeness = isCompleteLeagueHistoricalDossier(result.value) ? "complete" : "partial";
      this.deps.cache.setHistoricalArchive(archiveKey, "league-season", result.value, completeness);
    }
    this.deps.seasonResearch?.upsertLeagueHistoricalDossier(result.value);

    return result;
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
    const missingData = getMissingData({
      standingsCount: standings?.league.standings[0]?.length ?? 0,
      topScorersCount: topScorers?.length ?? 0,
      topAssistsCount: topAssists?.length ?? 0,
      hasCoverage: Boolean(coverage)
    });
    const source = getSource(errors, standings?.league.standings[0]?.length ?? 0, topScorers?.length ?? 0, topAssists?.length ?? 0);

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
        source,
        season,
        requestedSeason: season,
        resolvedSeason: season,
        fallbackSeasonUsed: false,
        completeness: source === "unavailable" ? "unavailable" : missingData.length === 0 ? "complete" : "partial",
        archiveEligible: isCompletedSeason(season),
        missingData,
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
    if (isTransientProviderError(error)) {
      throw error;
    }

    errors.push(`${label} unavailable${error instanceof Error ? `: ${error.message}` : ""}`);
    return undefined;
  }
}

function isTransientProviderError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.message.includes("429") || error.message.toLowerCase().includes("rate limit");
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
      requestedSeason: season,
      resolvedSeason: season,
      fallbackSeasonUsed: false,
      completeness: "unavailable",
      archiveEligible: isCompletedSeason(season),
      missingData: ["coverage", "standings", "top scorers", "top assists"],
      errors,
      refreshedAt: new Date().toISOString()
    }
  };
}

function isCompleteLeagueHistoricalDossier(dossier: LeagueHistoricalDossier) {
  return dossier.standings.length >= 10 && dossier.topScorers.length > 0 && dossier.topAssists.length > 0;
}

function getSource(errors: string[], standingsCount: number, topScorersCount: number, topAssistsCount: number) {
  if (errors.length === 0) return "live";
  return standingsCount > 0 || topScorersCount > 0 || topAssistsCount > 0 ? "partial" : "unavailable";
}

function getMissingData(input: {
  standingsCount: number;
  topScorersCount: number;
  topAssistsCount: number;
  hasCoverage: boolean;
}) {
  const missing: string[] = [];
  if (!input.hasCoverage) missing.push("coverage");
  if (input.standingsCount === 0) missing.push("standings");
  if (input.topScorersCount === 0) missing.push("top scorers");
  if (input.topAssistsCount === 0) missing.push("top assists");
  return missing;
}
