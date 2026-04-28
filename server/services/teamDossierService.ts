import type { TeamDossier } from "../../src/types";
import {
  ApiFootballClient,
  type ApiFootballFixtureSummary,
  type ApiFootballLineupRecord,
  type ApiFootballSeasonPlayerRecord,
  type ApiFootballTransferRecord
} from "../../src/providers/apiFootballClient";
import { serverConfig } from "../config";
import { isCompletedSeason, teamDossierTtl } from "./seasonCachePolicy";

interface TeamDossierServiceDeps {
  cache: {
    getOrSet<T>(key: string, ttlMs: number, fetchFresh: () => Promise<T>): Promise<{ value: T; source: "cache" | "live" }>;
    getHistoricalArchive<T>(key: string): T | undefined;
    setHistoricalArchive<T>(key: string, kind: string, value: T, completeness: "complete" | "partial"): void;
  };
  seasonResearch?: {
    upsertTeamDossier(dossier: TeamDossier): void;
  };
}

export class TeamDossierService {
  private readonly football?: ApiFootballClient;

  constructor(private readonly deps: TeamDossierServiceDeps) {
    this.football = serverConfig.apiFootballKey
      ? new ApiFootballClient(serverConfig.apiFootballKey, { minIntervalMs: serverConfig.apiFootballMinIntervalMs })
      : undefined;
  }

  async getTeamDossier(teamId: number, query: { teamName?: string; league?: number; season?: number }) {
    const league = query.league ?? serverConfig.apiFootballLeagueId;
    const season = query.season ?? serverConfig.apiFootballSeason;
    const archiveKey = `team-season-contract-v1:${teamId}:league:${league}:season:${season}`;

    if (isCompletedSeason(season)) {
      const archived = this.deps.cache.getHistoricalArchive<TeamDossier>(archiveKey);
      if (archived) {
        this.deps.seasonResearch?.upsertTeamDossier(archived);
        return { value: archived, source: "archive" as const };
      }
    }

    const result = await this.deps.cache.getOrSet(
      `team-dossier:v8:${league}:${season}:${teamId}`,
      teamDossierTtl(season),
      () => this.fetchTeamDossier(teamId, { ...query, league, season })
    );

    if (isCompletedSeason(season)) {
      const completeness = isCompleteTeamDossier(result.value) ? "complete" : "partial";
      this.deps.cache.setHistoricalArchive(archiveKey, "team-season", result.value, completeness);
    }
    this.deps.seasonResearch?.upsertTeamDossier(result.value);

    return result;
  }

  private async fetchTeamDossier(
    teamId: number,
    query: { teamName?: string; league: number; season: number }
  ): Promise<TeamDossier> {
    const errors: string[] = [];

    if (!this.football) {
      return createUnavailableDossier(teamId, query.teamName ?? `Team ${teamId}`, query.league, query.season, [
        "API-Football key is not configured."
      ]);
    }

    const profile = await capture(errors, "Team profile", () =>
      this.football!.getTeams({ id: teamId }).then((envelope) => envelope.response[0])
    );
    const seasonContext = await this.resolveSeasonContext(teamId, query.league, query.season, errors);
    const squad = await this.fetchSeasonPlayers(teamId, query.league, seasonContext.season, errors);
    const coach = await capture(errors, "Coach", () =>
      this.football!.getCoachs(teamId).then((envelope) => envelope.response[0])
    );
    const statistics = await capture(errors, "Team statistics", () =>
      this.football!.getTeamStatistics({ team: teamId, league: query.league, season: seasonContext.season }).then((envelope) => envelope.response)
    );
    const injuries = await capture(errors, "Injuries", () =>
      this.football!.getInjuries({ team: teamId, league: query.league, season: seasonContext.season }).then((envelope) => envelope.response)
    );
    const transfers = await capture(errors, "Transfers", () =>
      this.football!.getTransfers({ team: teamId }).then((envelope) => envelope.response)
    );
    const recentFixtures = seasonContext.recentFixtures;

    const recentLineups = await this.fetchRecentLineups(teamId, recentFixtures ?? [], errors);
    const profileTeam = profile?.team;
    const missingData = getMissingData({
      squadCount: squad?.length ?? 0,
      recentFixtureCount: recentFixtures.length,
      lineupCount: recentLineups.length,
      hasStatistics: Boolean(statistics),
      hasCoach: Boolean(coach),
      hasVenue: Boolean(profile?.venue)
    });
    const source = getSource(errors, Boolean(profile), squad?.length ?? 0, recentFixtures.length);
    const completeness = source === "unavailable" ? "unavailable" : missingData.length === 0 ? "complete" : "partial";

    return {
      team: {
        id: teamId,
        name: profileTeam?.name ?? query.teamName ?? `Team ${teamId}`,
        logo: profileTeam?.logo,
        founded: profileTeam?.founded,
        country: profileTeam?.country
      },
      league: {
        id: query.league,
        season: seasonContext.season
      },
      venue: profile?.venue
        ? {
            id: profile.venue.id,
            name: profile.venue.name,
            city: profile.venue.city,
            capacity: profile.venue.capacity,
            surface: profile.venue.surface,
            image: profile.venue.image
          }
        : undefined,
      squad:
        squad?.map((player) => mapSeasonPlayer(player, teamId, query.league, seasonContext.season)) ?? [],
      coach: coach
        ? {
            id: coach.id,
            name: coach.name ?? [coach.firstname, coach.lastname].filter(Boolean).join(" "),
            age: coach.age,
            nationality: coach.nationality,
            photo: coach.photo
          }
        : undefined,
      injuries:
        injuries?.slice(0, 12).map((injury) => ({
          player: injury.player.name,
          reason: injury.player.reason,
          type: injury.player.type,
          fixture: injury.fixture?.date
        })) ?? [],
      transfers: mapTransfers(transfers ?? [], teamId, seasonContext.season).slice(0, 30),
      recentFixtures: (recentFixtures ?? []).map(mapRecentFixture),
      recentLineups,
      statistics,
      dataStatus: {
        source,
        season: seasonContext.season,
        requestedSeason: query.season,
        resolvedSeason: seasonContext.season,
        fallbackSeasonUsed: seasonContext.fallbackSeasonUsed,
        completeness,
        archiveEligible: isCompletedSeason(query.season),
        missingData,
        errors,
        refreshedAt: new Date().toISOString()
      }
    };
  }

  private async resolveSeasonContext(teamId: number, league: number, season: number, errors: string[]) {
    const range = getSeasonDateRange(season);
    const recentFixtures =
      (await capture(errors, "Recent fixtures", () =>
        this.football!.listFixtures({ team: teamId, league, season, from: range.from, to: range.to }).then((envelope) => envelope.response)
      )) ?? [];

    if (recentFixtures.length === 0) {
      errors.push(
        `No fixtures returned for requested season ${season}. Older seasons are no longer substituted automatically, so the UI can show this as missing coverage instead of stale data.`
      );
    }

    return { season, recentFixtures, fallbackSeasonUsed: false };
  }

  private async fetchSeasonPlayers(teamId: number, league: number, season: number, errors: string[]) {
    if (!this.football) return [];

    const firstPage = await capture(errors, "Season players", () =>
      this.football!.getPlayers({ team: teamId, league, season, page: 1 })
    );

    if (!firstPage) return [];

    const totalPages = Math.min(firstPage.paging.total, 5);
    const players = [...firstPage.response];

    for (let page = 2; page <= totalPages; page += 1) {
      const pageEnvelope = await capture(errors, `Season players page ${page}`, () =>
        this.football!.getPlayers({ team: teamId, league, season, page })
      );
      players.push(...(pageEnvelope?.response ?? []));
    }

    return players;
  }

  private async fetchRecentLineups(teamId: number, fixtures: ApiFootballFixtureSummary[], errors: string[]) {
    if (!this.football) return [];

    const completedFixtures = fixtures
      .filter((fixture) => fixture.goals.home !== null && fixture.goals.away !== null)
      .slice(0, 1);

    const lineups = await Promise.all(
      completedFixtures.map(async (fixture) => {
        const response = await capture(errors, `Lineup ${fixture.fixture.id}`, () =>
          this.football!.getLineups(fixture.fixture.id).then((envelope) => envelope.response)
        );
        const lineup = response?.find((item) => item.team.id === teamId);
        return lineup ? mapLineup(fixture, lineup, teamId) : undefined;
      })
    );

    return lineups.filter((lineup): lineup is NonNullable<typeof lineup> => Boolean(lineup));
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

function mapRecentFixture(fixture: ApiFootballFixtureSummary): TeamDossier["recentFixtures"][number] {
  return {
    id: fixture.fixture.id,
    date: fixture.fixture.date,
    home: fixture.teams.home.name,
    away: fixture.teams.away.name,
    homeGoals: fixture.goals.home,
    awayGoals: fixture.goals.away,
    venue: fixture.fixture.venue?.name
  };
}

function mapSeasonPlayer(
  record: ApiFootballSeasonPlayerRecord,
  teamId: number,
  league: number,
  season: number
): TeamDossier["squad"][number] {
  const stats =
    record.statistics.find((item) => item.team?.id === teamId && item.league?.id === league && item.league?.season === season) ??
    record.statistics.find((item) => item.team?.id === teamId && item.league?.id === league) ??
    record.statistics[0];
  return {
    id: record.player.id,
    name: record.player.name,
    age: record.player.age,
    number: stats?.games?.number,
    position: stats?.games?.position,
    photo: record.player.photo,
    appearances: stats?.games?.appearences,
    lineups: stats?.games?.lineups,
    minutes: stats?.games?.minutes,
    goals: stats?.goals?.total,
    assists: stats?.goals?.assists
  };
}

function mapLineup(
  fixture: ApiFootballFixtureSummary,
  lineup: ApiFootballLineupRecord,
  teamId: number
): TeamDossier["recentLineups"][number] {
  const opponent = fixture.teams.home.id === teamId ? fixture.teams.away.name : fixture.teams.home.name;
  return {
    fixtureId: fixture.fixture.id,
    date: fixture.fixture.date,
    opponent,
    formation: lineup.formation,
    startXI: lineup.startXI.map(({ player }) => player.name)
  };
}

function mapTransfers(records: ApiFootballTransferRecord[], teamId: number, season: number): TeamDossier["transfers"] {
  const seasonStart = new Date(`${season}-06-01T00:00:00Z`).getTime();
  const seasonEnd = new Date(`${season + 1}-09-01T00:00:00Z`).getTime();

  return records
    .flatMap((record) =>
      record.transfers.map((transfer) => {
        const inTeam = transfer.teams?.in;
        const outTeam = transfer.teams?.out;
        const direction = inTeam?.id === teamId ? "in" : outTeam?.id === teamId ? "out" : "other";

        return {
          player: record.player.name,
          date: transfer.date,
          type: transfer.type,
          in: inTeam?.name,
          out: outTeam?.name,
          direction
        } satisfies TeamDossier["transfers"][number];
      })
    )
    .filter((transfer) => {
      if (!transfer.date) return false;
      const time = new Date(transfer.date).getTime();
      return time >= seasonStart && time <= seasonEnd;
    })
    .sort((first, second) => new Date(second.date ?? 0).getTime() - new Date(first.date ?? 0).getTime());
}

function createUnavailableDossier(
  teamId: number,
  teamName: string,
  league: number,
  season: number,
  errors: string[]
): TeamDossier {
  return {
    team: {
      id: teamId,
      name: teamName
    },
    league: {
      id: league,
      season
    },
    squad: [],
    injuries: [],
    transfers: [],
    recentFixtures: [],
    recentLineups: [],
    dataStatus: {
      source: "unavailable",
      season,
      requestedSeason: season,
      resolvedSeason: season,
      fallbackSeasonUsed: false,
      completeness: "unavailable",
      archiveEligible: isCompletedSeason(season),
      missingData: ["team profile", "squad", "fixtures", "team statistics", "coach", "venue"],
      errors,
      refreshedAt: new Date().toISOString()
    }
  };
}

function getSeasonDateRange(season: number) {
  return {
    from: `${season}-08-01`,
    to: `${season + 1}-06-30`
  };
}

function isCompleteTeamDossier(dossier: TeamDossier) {
  return dossier.squad.length > 0 && dossier.recentFixtures.length > 0;
}

function getSource(errors: string[], hasProfile: boolean, squadCount: number, recentFixtureCount: number) {
  if (errors.length === 0) return "live";
  return hasProfile || squadCount > 0 || recentFixtureCount > 0 ? "partial" : "unavailable";
}

function getMissingData(input: {
  squadCount: number;
  recentFixtureCount: number;
  lineupCount: number;
  hasStatistics: boolean;
  hasCoach: boolean;
  hasVenue: boolean;
}) {
  const missing: string[] = [];
  if (input.squadCount === 0) missing.push("squad");
  if (input.recentFixtureCount === 0) missing.push("season fixtures");
  if (input.lineupCount === 0) missing.push("recent lineups");
  if (!input.hasStatistics) missing.push("team statistics");
  if (!input.hasCoach) missing.push("manager");
  if (!input.hasVenue) missing.push("venue");
  return missing;
}
