import type { TeamDossier } from "../../src/types";
import {
  ApiFootballClient,
  type ApiFootballFixtureSummary,
  type ApiFootballLineupRecord
} from "../../src/providers/apiFootballClient";
import { serverConfig } from "../config";

const TEAM_DOSSIER_TTL_MS = 6 * 60 * 60 * 1000;

interface TeamDossierServiceDeps {
  cache: {
    getOrSet<T>(key: string, ttlMs: number, fetchFresh: () => Promise<T>): Promise<{ value: T; source: "cache" | "live" }>;
  };
}

export class TeamDossierService {
  private readonly football?: ApiFootballClient;

  constructor(private readonly deps: TeamDossierServiceDeps) {
    this.football = serverConfig.apiFootballKey ? new ApiFootballClient(serverConfig.apiFootballKey) : undefined;
  }

  async getTeamDossier(teamId: number, query: { teamName?: string; league?: number; season?: number }) {
    const league = query.league ?? serverConfig.apiFootballLeagueId;
    const season = query.season ?? serverConfig.apiFootballSeason;

    return this.deps.cache.getOrSet(
      `team-dossier:v3:${league}:${season}:${teamId}`,
      TEAM_DOSSIER_TTL_MS,
      () => this.fetchTeamDossier(teamId, { ...query, league, season })
    );
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
    const squad = await capture(errors, "Squad", () =>
      this.football!.getSquad(teamId).then((envelope) => envelope.response[0]?.players ?? [])
    );
    const coach = await capture(errors, "Coach", () =>
      this.football!.getCoachs(teamId).then((envelope) => envelope.response[0])
    );
    const seasonContext = await this.resolveSeasonContext(teamId, query.league, query.season, errors);
    const statistics = await capture(errors, "Team statistics", () =>
      this.football!.getTeamStatistics({ team: teamId, league: query.league, season: seasonContext.season }).then((envelope) => envelope.response)
    );
    const injuries = await capture(errors, "Injuries", () =>
      this.football!.getInjuries({ team: teamId, league: query.league, season: seasonContext.season }).then((envelope) => envelope.response)
    );
    const recentFixtures = seasonContext.recentFixtures;

    const recentLineups = await this.fetchRecentLineups(teamId, recentFixtures ?? [], errors);
    const profileTeam = profile?.team;

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
        squad?.map((player) => ({
          id: player.id,
          name: player.name,
          age: player.age,
          number: player.number,
          position: player.position,
          photo: player.photo
        })) ?? [],
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
      recentFixtures: (recentFixtures ?? []).map(mapRecentFixture),
      recentLineups,
      statistics,
      dataStatus: {
        source: errors.length === 0 ? "live" : profile || squad || recentFixtures ? "partial" : "unavailable",
        season: seasonContext.season,
        errors,
        refreshedAt: new Date().toISOString()
      }
    };
  }

  private async resolveSeasonContext(teamId: number, league: number, season: number, errors: string[]) {
    const recentFixtures =
      (await capture(errors, "Recent fixtures", () =>
        this.football!.listFixtures({ team: teamId, league, season, last: 8 }).then((envelope) => envelope.response)
      )) ?? [];

    if (recentFixtures.length > 0 || season <= 1900) {
      return { season, recentFixtures };
    }

    for (let fallbackSeason = season - 1; fallbackSeason >= season - 4; fallbackSeason -= 1) {
      const fallbackFixtures =
        (await capture(errors, `Fallback recent fixtures ${fallbackSeason}`, () =>
          this.football!.listFixtures({ team: teamId, league, season: fallbackSeason, last: 8 }).then((envelope) => envelope.response)
        )) ?? [];

      if (fallbackFixtures.length > 0) {
        return { season: fallbackSeason, recentFixtures: fallbackFixtures };
      }
    }

    errors.push(`No recent fixtures returned for seasons ${season}-${season - 4}. This may be plan or coverage related.`);
    return { season, recentFixtures };
  }

  private async fetchRecentLineups(teamId: number, fixtures: ApiFootballFixtureSummary[], errors: string[]) {
    if (!this.football) return [];

    const completedFixtures = fixtures
      .filter((fixture) => fixture.goals.home !== null && fixture.goals.away !== null)
      .slice(0, 3);

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
    errors.push(`${label} unavailable${error instanceof Error ? `: ${error.message}` : ""}`);
    return undefined;
  }
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
    recentFixtures: [],
    recentLineups: [],
    dataStatus: {
      source: "unavailable",
      season,
      errors,
      refreshedAt: new Date().toISOString()
    }
  };
}
