import { analyseFixture } from "../../src/model/probability";
import type { Fixture } from "../../src/types";
import type { DatabaseConnection } from "../db/types";
import { FixturesRepository } from "../repositories/fixturesRepository";
import { LeaguesRepository, leagueIdFromProvider } from "../repositories/leaguesRepository";
import { OddsRepository } from "../repositories/oddsRepository";
import { OpportunitiesRepository } from "../repositories/opportunitiesRepository";
import { TeamsRepository, venueIdFromFixture } from "../repositories/teamsRepository";

export class FixtureSnapshotSync {
  private readonly leagues: LeaguesRepository;
  private readonly teams: TeamsRepository;
  private readonly fixtures: FixturesRepository;
  private readonly odds: OddsRepository;
  private readonly opportunities: OpportunitiesRepository;

  constructor(db: DatabaseConnection) {
    this.leagues = new LeaguesRepository(db);
    this.teams = new TeamsRepository(db);
    this.fixtures = new FixturesRepository(db);
    this.odds = new OddsRepository(db);
    this.opportunities = new OpportunitiesRepository(db);
  }

  syncFixtures(fixtures: Fixture[], source: "live" | "cache" | "mock" = "live") {
    const capturedAt = Date.now();

    fixtures.forEach((fixture) => {
      const leagueId = leagueIdFromProvider(undefined, fixture.competition);
      const season = inferSeason(fixture.kickoff);
      const venueId = venueIdFromFixture(fixture);

      this.leagues.upsertLeague({
        id: leagueId,
        provider: "local",
        name: fixture.competition,
        logoUrl: fixture.competitionLogoUrl
      });
      this.leagues.upsertLeagueSeason({
        leagueId,
        season,
        dataStatus: source
      });

      if (venueId) {
        this.teams.upsertVenue({
          id: venueId,
          name: fixture.venue,
          imageUrl: fixture.venueImageUrl
        });
      }

      this.teams.upsertTeamSnapshot(fixture.home);
      this.teams.upsertTeamSnapshot(fixture.away);
      this.fixtures.upsertFixture(fixture, { season });
      this.odds.recordFixtureMarketOdds(fixture, capturedAt);
      this.opportunities.upsertBestFixtureOpportunity(fixture, analyseFixture(fixture), capturedAt);
    });
  }
}

function inferSeason(kickoff: string) {
  const date = new Date(kickoff);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  return month >= 7 ? year : year - 1;
}
