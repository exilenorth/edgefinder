export type AuditProvider = "api-football" | "the-odds-api";

export interface AuditRunInput {
  provider: AuditProvider;
  leagueId?: number;
  season?: number;
  sportKey?: string;
  notes?: string;
}

export interface AuditRequestRecord {
  id: string;
  runId: string;
  provider: AuditProvider;
  endpoint: string;
  params: Record<string, string | number | boolean | undefined>;
  statusCode?: number;
  success: boolean;
  errorMessage?: string;
  durationMs: number;
  fetchedAt: number;
  response?: unknown;
}

export interface FieldPathSummary {
  fieldPath: string;
  sampleType: string;
  sampleValue: string;
  occurrenceCount: number;
}

export interface EndpointSummaryInput {
  runId: string;
  provider: AuditProvider;
  endpoint: string;
  tested: boolean;
  available: boolean;
  resultCount?: number;
  coverageNotes?: string;
  recommendedUse?: string;
}

export interface ApiFootballAuditOptions {
  league: number;
  season: number;
  sampleFixtures: number;
  maxTeams: number;
  maxPlayerPages: number;
  minIntervalMs: number;
  dbPath: string;
  reportDir: string;
}

export interface OddsApiAuditOptions {
  sport: string;
  regions: string;
  markets: string;
  bookmakers?: string;
  sampleEvents: number;
  dbPath: string;
  reportDir: string;
}
