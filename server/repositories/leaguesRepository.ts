import type { LeagueHistoricalDossier } from "../../src/types";
import type { DatabaseConnection } from "../db/types";

export class LeaguesRepository {
  constructor(private readonly db: DatabaseConnection) {}

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

