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
  "opportunity_snapshots"
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

