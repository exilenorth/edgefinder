import type { Fixture } from "../../src/types";
import type { FixturesRepository } from "../repositories/fixturesRepository";
import type { LeaguesRepository } from "../repositories/leaguesRepository";
import type { TeamsRepository } from "../repositories/teamsRepository";

interface NormalizedFixtureDeps {
  fixtures: FixturesRepository;
  leagues: LeaguesRepository;
  teams: TeamsRepository;
}

export class NormalizedFixtureService {
  constructor(private readonly deps: NormalizedFixtureDeps) {}

  listFixtures(options: { leagueId?: string; season?: number } = {}): Fixture[] {
    return this.deps.fixtures.listUpcoming(options);
  }

  getFixture(id: string): Fixture | undefined {
    const fixtures = this.deps.fixtures.listUpcoming({ limit: 200 });
    return fixtures.find((fixture) => fixture.id === id);
  }

  getSnapshot(): { count: number; latestKickoff: string | null; capturedAt: number | null } {
    return this.deps.fixtures.getLatestSnapshot();
  }

  listLeaguesWithFixtures(): { id: string; name: string; logoUrl: string | null; fixtureCount: number }[] {
    return this.deps.leagues.listWithFixtures();
  }

  listTeamsWithFixtures(): { id: string; name: string; logoUrl: string | null; fixtureCount: number }[] {
    return this.deps.teams.listWithFixtures();
  }
}
