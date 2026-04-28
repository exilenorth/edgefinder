import type { DatabaseConnection } from "../db/types";

const DOMAIN_TABLES = [
  "provider_requests",
  "leagues",
  "league_seasons",
  "teams",
  "venues",
  "fixtures",
  "fixture_teams",
  "odds_events",
  "odds_snapshots",
  "opportunities",
  "opportunity_snapshots",
  "season_data_status",
  "league_standings",
  "league_player_rankings",
  "team_season_statistics",
  "team_season_players",
  "team_transfers",
  "fixture_lineups"
] as const;

export class DomainStatsRepository {
  constructor(private readonly db: DatabaseConnection) {}

  getSummary() {
    return Object.fromEntries(
      DOMAIN_TABLES.map((table) => {
        const [row] = this.db.query<{ count: number }>(`SELECT COUNT(*) as count FROM ${table}`);
        return [table, row?.count ?? 0];
      })
    ) as Record<(typeof DOMAIN_TABLES)[number], number>;
  }
}

