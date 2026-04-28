import type { Fixture, TeamDossier, TeamSnapshot } from "../../src/types";
import type { DatabaseConnection } from "../db/types";

export class TeamsRepository {
  constructor(private readonly db: DatabaseConnection) {}

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

