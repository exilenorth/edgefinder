import type { LeagueHistoricalDossier } from "../../src/types";
import type { DatabaseConnection } from "../db/types";

interface LeagueRow {
  [key: string]: unknown;
  id: string; provider: string; provider_league_id: string | null;
  name: string; logo_url: string | null; country: string | null; updated_at: number;
}

export class LeaguesRepository {
  constructor(private readonly db: DatabaseConnection) {}

  listAll(): LeagueRow[] {
    return this.db.query<LeagueRow>(
      "SELECT id, name, logo_url FROM leagues ORDER BY name ASC"
    );
  }

  listWithFixtures(): { id: string; name: string; logoUrl: string | null; fixtureCount: number }[] {
    const rows = this.db.query<{ id: string; name: string; logo_url: string | null; fixture_count: number }>(
      `SELECT l.id, l.name, l.logo_url, COUNT(f.id) as fixture_count
       FROM leagues l
       INNER JOIN fixtures f ON f.league_id = l.id AND f.kickoff >= ?
       GROUP BY l.id
       ORDER BY fixture_count DESC, l.name ASC`,
      [new Date().toISOString()]
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      logoUrl: row.logo_url,
      fixtureCount: row.fixture_count
    }));
  }

  upsertLeague(input: {
    id: string;
    provider: string;
    providerLeagueId?: string | number;
    name: string;
    logoUrl?: string;
    country?: string;
  }) {
    this.db.run(
      `INSERT INTO leagues (id, provider, provider_league_id, name, logo_url, country, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         provider = excluded.provider,
         provider_league_id = excluded.provider_league_id,
         name = excluded.name,
         logo_url = COALESCE(excluded.logo_url, leagues.logo_url),
         country = COALESCE(excluded.country, leagues.country),
         updated_at = excluded.updated_at`,
      [
        input.id,
        input.provider,
        input.providerLeagueId === undefined ? null : String(input.providerLeagueId),
        input.name,
        input.logoUrl ?? null,
        input.country ?? null,
        Date.now()
      ]
    );
  }

  upsertLeagueSeason(input: {
    leagueId: string;
    season: number;
    isCurrent?: boolean;
    coverage?: unknown;
    dataStatus?: string;
    archivedAt?: number;
  }) {
    const id = `${input.leagueId}:season:${input.season}`;
    this.db.run(
      `INSERT INTO league_seasons
        (id, league_id, season, is_current, coverage_json, data_status, archived_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         is_current = excluded.is_current,
         coverage_json = COALESCE(excluded.coverage_json, league_seasons.coverage_json),
         data_status = excluded.data_status,
         archived_at = COALESCE(excluded.archived_at, league_seasons.archived_at),
         updated_at = excluded.updated_at`,
      [
        id,
        input.leagueId,
        input.season,
        input.isCurrent ? 1 : 0,
        input.coverage ? JSON.stringify(input.coverage) : null,
        input.dataStatus ?? "unknown",
        input.archivedAt ?? null,
        Date.now()
      ]
    );
  }

  upsertHistoricalDossier(dossier: LeagueHistoricalDossier, archivedAt?: number) {
    const leagueId = leagueIdFromProvider(dossier.league.id, dossier.league.name);
    this.upsertLeague({
      id: leagueId,
      provider: "api-football",
      providerLeagueId: dossier.league.id,
      name: dossier.league.name ?? `League ${dossier.league.id}`,
      logoUrl: dossier.league.logo
    });
    this.upsertLeagueSeason({
      leagueId,
      season: dossier.league.season,
      coverage: dossier.coverage,
      dataStatus: dossier.dataStatus.source,
      archivedAt
    });
  }
}

export function leagueIdFromProvider(providerLeagueId: string | number | undefined, leagueName: string | undefined) {
  if (providerLeagueId !== undefined) return `api-football:league:${providerLeagueId}`;
  return `league:${slug(leagueName ?? "unknown")}`;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

