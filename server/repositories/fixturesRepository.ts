import type { Fixture } from "../../src/types";
import type { DatabaseConnection } from "../db/types";
import { leagueIdFromProvider } from "./leaguesRepository";
import { teamIdFromSnapshot, venueIdFromFixture } from "./teamsRepository";

interface FixtureRow {
  [key: string]: unknown;
  id: string; provider: string; provider_fixture_id: string | null;
  league_id: string | null; season: number | null; kickoff: string;
  status: string | null; venue_id: string | null;
  home_team_id: string; away_team_id: string;
  home_goals: number | null; away_goals: number | null;
  source_json: string; updated_at: number;
}

export class FixturesRepository {
  constructor(private readonly db: DatabaseConnection) {}

  listUpcoming(options: { leagueId?: string; season?: number; limit?: number } = {}): Fixture[] {
    const clauses: string[] = ["kickoff >= ?"];
    const params: (string | number)[] = [new Date().toISOString()];

    if (options.leagueId) {
      clauses.push("league_id = ?");
      params.push(options.leagueId);
    }
    if (options.season !== undefined) {
      clauses.push("season = ?");
      params.push(options.season);
    }

    const limit = options.limit ?? 50;
    const rows = this.db.query<FixtureRow>(
      `SELECT source_json FROM fixtures WHERE ${clauses.join(" AND ")} ORDER BY kickoff ASC LIMIT ?`,
      [...params, limit]
    );

    return rows.map((row) => JSON.parse(row.source_json) as Fixture);
  }

  getLatestSnapshot(): { count: number; latestKickoff: string | null; capturedAt: number | null } {
    const rows = this.db.query<{ total: number; latest_kickoff: string | null; latest_updated: number | null }>(
      "SELECT COUNT(*) as total, MAX(kickoff) as latest_kickoff, MAX(updated_at) as latest_updated FROM fixtures WHERE kickoff >= ?",
      [new Date().toISOString()]
    );
    const row = rows[0];
    return {
      count: row?.total ?? 0,
      latestKickoff: row?.latest_kickoff ?? null,
      capturedAt: row?.latest_updated ?? null
    };
  }

  countByLeague(leagueId: string): number {
    const rows = this.db.query<{ total: number }>(
      "SELECT COUNT(*) as total FROM fixtures WHERE league_id = ? AND kickoff >= ?",
      [leagueId, new Date().toISOString()]
    );
    return rows[0]?.total ?? 0;
  }

  upsertFixture(fixture: Fixture, options: { provider?: string; providerFixtureId?: string; season?: number } = {}) {
    const leagueId = leagueIdFromProvider(undefined, fixture.competition);
    const venueId = venueIdFromFixture(fixture);
    const homeTeamId = teamIdFromSnapshot(fixture.home);
    const awayTeamId = teamIdFromSnapshot(fixture.away);

    this.db.run(
      `INSERT INTO fixtures
        (id, provider, provider_fixture_id, league_id, season, kickoff, status, venue_id,
         home_team_id, away_team_id, home_goals, away_goals, source_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         provider = excluded.provider,
         provider_fixture_id = excluded.provider_fixture_id,
         league_id = excluded.league_id,
         season = COALESCE(excluded.season, fixtures.season),
         kickoff = excluded.kickoff,
         status = COALESCE(excluded.status, fixtures.status),
         venue_id = COALESCE(excluded.venue_id, fixtures.venue_id),
         home_team_id = excluded.home_team_id,
         away_team_id = excluded.away_team_id,
         home_goals = COALESCE(excluded.home_goals, fixtures.home_goals),
         away_goals = COALESCE(excluded.away_goals, fixtures.away_goals),
         source_json = excluded.source_json,
         updated_at = excluded.updated_at`,
      [
        fixture.id,
        options.provider ?? providerFromFixtureId(fixture.id),
        options.providerFixtureId ?? providerIdFromFixtureId(fixture.id),
        leagueId,
        options.season ?? inferSeason(fixture.kickoff),
        fixture.kickoff,
        null,
        venueId ?? null,
        homeTeamId,
        awayTeamId,
        null,
        null,
        JSON.stringify(fixture),
        Date.now()
      ]
    );

    this.db.run(
      "INSERT OR REPLACE INTO fixture_teams (fixture_id, team_id, side) VALUES (?, ?, ?)",
      [fixture.id, homeTeamId, "home"]
    );
    this.db.run(
      "INSERT OR REPLACE INTO fixture_teams (fixture_id, team_id, side) VALUES (?, ?, ?)",
      [fixture.id, awayTeamId, "away"]
    );
  }
}

function providerFromFixtureId(id: string) {
  if (id.startsWith("api-football:")) return "api-football";
  if (id.startsWith("odds-api:")) return "the-odds-api";
  return "local";
}

function providerIdFromFixtureId(id: string) {
  return id.includes(":") ? id.split(":").slice(1).join(":") : id;
}

function inferSeason(kickoff: string) {
  const date = new Date(kickoff);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  return month >= 7 ? year : year - 1;
}

