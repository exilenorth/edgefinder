import type { LeagueSummary, TeamSummary } from "../app/types";
import type { Fixture } from "../types";
import { getLeagueLogoUrl } from "../data/eplClubProfiles";

export function buildLeagueSummaries(fixtures: Fixture[]): LeagueSummary[] {
  const leagues = new Map<string, { fixtures: Fixture[]; teams: Set<string>; logoUrl?: string }>();

  fixtures.forEach((fixture) => {
    const current = leagues.get(fixture.competition) ?? { fixtures: [], teams: new Set<string>(), logoUrl: undefined };
    current.fixtures.push(fixture);
    current.teams.add(fixture.home.id);
    current.teams.add(fixture.away.id);
    current.logoUrl = current.logoUrl ?? fixture.competitionLogoUrl ?? getLeagueLogoUrl(fixture.competition);
    leagues.set(fixture.competition, current);
  });

  return Array.from(leagues.entries())
    .map(([name, value]) => ({
      name,
      logoUrl: value.logoUrl,
      fixtureCount: value.fixtures.length,
      teamCount: value.teams.size,
      fixtures: value.fixtures
        .slice()
        .sort((first, second) => new Date(first.kickoff).getTime() - new Date(second.kickoff).getTime()),
      nextKickoff: value.fixtures
        .slice()
        .sort((first, second) => new Date(first.kickoff).getTime() - new Date(second.kickoff).getTime())[0]?.kickoff
    }))
    .sort((first, second) => first.name.localeCompare(second.name));
}

export function buildTeamSummaries(fixtures: Fixture[]): TeamSummary[] {
  const teams = new Map<string, TeamSummary>();

  fixtures
    .slice()
    .sort((first, second) => new Date(first.kickoff).getTime() - new Date(second.kickoff).getTime())
    .forEach((fixture) => {
      [fixture.home, fixture.away].forEach((team) => {
        const key = `${fixture.competition}:${team.id}`;
        const current = teams.get(key);
        teams.set(key, {
          team,
          league: fixture.competition,
          fixtureCount: (current?.fixtureCount ?? 0) + 1,
          nextFixture: current?.nextFixture ?? fixture,
          fixtures: [...(current?.fixtures ?? []), fixture]
        });
      });
    });

  return Array.from(teams.values()).sort((first, second) => {
    const leagueSort = first.league.localeCompare(second.league);
    return leagueSort !== 0 ? leagueSort : first.team.name.localeCompare(second.team.name);
  });
}
