import type { Fixture, TeamDossier, TeamSnapshot } from "../../src/types";
import type { DatabaseConnection } from "../db/types";

interface TeamRow {
  [key: string]: unknown;
  id: string; provider: string; provider_team_id: string | null;
  name: string; logo_url: string | null; country: string | null;
  founded: number | null; venue_id: string | null; updated_at: number;
}

export class TeamsRepository {
  constructor(private readonly db: DatabaseConnection) {}

  listAll(): { id: string; name: string; logoUrl: string | null }[] {
    const rows = this.db.query<TeamRow>(
      "SELECT id, name, logo_url FROM teams ORDER BY name ASC"
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      logoUrl: row.logo_url
    }));
  }

  listWithFixtures(): { id: string; name: string; logoUrl: string | null; fixtureCount: number }[] {
    const rows = this.db.query<{ id: string; name: string; logo_url: string | null; fixture_count: number }>(
      `SELECT t.id, t.name, t.logo_url, COUNT(ft.fixture_id) as fixture_count
       FROM teams t
       INNER JOIN fixture_teams ft ON ft.team_id = t.id
       INNER JOIN fixtures f ON f.id = ft.fixture_id AND f.kickoff >= ?
       GROUP BY t.id
       ORDER BY fixture_count DESC, t.name ASC`,
      [new Date().toISOString()]
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      logoUrl: row.logo_url,
      fixtureCount: row.fixture_count
    }));
  }

  upsertTeamSnapshot(team: TeamSnapshot, venueId?: string) {
    this.upsertTeam({
      id: teamIdFromSnapshot(team),
      provider: getProvider(team.id),
      providerTeamId: getProviderId(team.id),
      name: team.name,
      logoUrl: team.logoUrl,
      venueId
    });
  }

  upsertTeam(input: {
    id: string;
    provider: string;
    providerTeamId?: string | number;
    name: string;
    logoUrl?: string;
    country?: string;
    founded?: number;
    venueId?: string;
  }) {
    this.db.run(
      `INSERT INTO teams (id, provider, provider_team_id, name, logo_url, country, founded, venue_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         provider = excluded.provider,
         provider_team_id = excluded.provider_team_id,
         name = excluded.name,
         logo_url = COALESCE(excluded.logo_url, teams.logo_url),
         country = COALESCE(excluded.country, teams.country),
         founded = COALESCE(excluded.founded, teams.founded),
         venue_id = COALESCE(excluded.venue_id, teams.venue_id),
         updated_at = excluded.updated_at`,
      [
        input.id,
        input.provider,
        input.providerTeamId === undefined ? null : String(input.providerTeamId),
        input.name,
        input.logoUrl ?? null,
        input.country ?? null,
        input.founded ?? null,
        input.venueId ?? null,
        Date.now()
      ]
    );
  }

  upsertVenue(input: {
    id: string;
    provider?: string;
    providerVenueId?: string | number;
    name: string;
    city?: string;
    capacity?: number;
    surface?: string;
    imageUrl?: string;
  }) {
    this.db.run(
      `INSERT INTO venues (id, provider, provider_venue_id, name, city, capacity, surface, image_url, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         provider = COALESCE(excluded.provider, venues.provider),
         provider_venue_id = COALESCE(excluded.provider_venue_id, venues.provider_venue_id),
         name = excluded.name,
         city = COALESCE(excluded.city, venues.city),
         capacity = COALESCE(excluded.capacity, venues.capacity),
         surface = COALESCE(excluded.surface, venues.surface),
         image_url = COALESCE(excluded.image_url, venues.image_url),
         updated_at = excluded.updated_at`,
      [
        input.id,
        input.provider ?? null,
        input.providerVenueId === undefined ? null : String(input.providerVenueId),
        input.name,
        input.city ?? null,
        input.capacity ?? null,
        input.surface ?? null,
        input.imageUrl ?? null,
        Date.now()
      ]
    );
  }

  upsertTeamDossier(dossier: TeamDossier) {
    const venueId = dossier.venue?.id
      ? `api-football:venue:${dossier.venue.id}`
      : dossier.venue?.name
        ? `venue:${slug(dossier.venue.name)}`
        : undefined;

    if (dossier.venue?.name && venueId) {
      this.upsertVenue({
        id: venueId,
        provider: "api-football",
        providerVenueId: dossier.venue.id,
        name: dossier.venue.name,
        city: dossier.venue.city,
        capacity: dossier.venue.capacity,
        surface: dossier.venue.surface,
        imageUrl: dossier.venue.image
      });
    }

    this.upsertTeam({
      id: `api-football:team:${dossier.team.id}`,
      provider: "api-football",
      providerTeamId: dossier.team.id,
      name: dossier.team.name,
      logoUrl: dossier.team.logo,
      country: dossier.team.country,
      founded: dossier.team.founded,
      venueId
    });
  }
}

export function teamIdFromSnapshot(team: TeamSnapshot) {
  const provider = getProvider(team.id);
  const providerId = getProviderId(team.id);
  return providerId ? `${provider}:team:${providerId}` : `team:${slug(team.name)}`;
}

export function venueIdFromFixture(fixture: Fixture) {
  if (!fixture.venue || fixture.venue === "TBC") return undefined;
  return `venue:${slug(fixture.venue)}`;
}

function getProvider(id: string) {
  return /^\d+$/.test(id) ? "api-football" : "local";
}

function getProviderId(id: string) {
  return /^\d+$/.test(id) ? id : undefined;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

