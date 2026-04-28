import type { Fixture } from "../../src/types";
import type { OddsApiEvent } from "../../src/providers/theOddsApiClient";
import type { DatabaseConnection } from "../db/types";
import { OddsRepository } from "../repositories/oddsRepository";

export class OddsSnapshotSync {
  private readonly odds: OddsRepository;

  constructor(db: DatabaseConnection) {
    this.odds = new OddsRepository(db);
  }

  syncOddsEvents(events: OddsApiEvent[], fixtures: Fixture[], capturedAt = Date.now()) {
    events.forEach((event) => {
      const fixtureId = findFixtureIdForEvent(event, fixtures);
      this.odds.upsertOddsEvent(event, fixtureId, capturedAt);
    });
  }
}

function findFixtureIdForEvent(event: OddsApiEvent, fixtures: Fixture[]) {
  return fixtures.find((fixture) => {
    const kickoffDelta = Math.abs(new Date(event.commence_time).getTime() - new Date(fixture.kickoff).getTime());
    return kickoffDelta <= 3 * 60 * 60 * 1000 && sameTeam(event.home_team, fixture.home.name) && sameTeam(event.away_team, fixture.away.name);
  })?.id;
}

function sameTeam(a: string, b: string) {
  const first = slugify(a);
  const second = slugify(b);
  return first === second || first.includes(second) || second.includes(first);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

