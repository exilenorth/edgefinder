import { serverConfig } from "../config";

export const LIVE_TEAM_DOSSIER_TTL_MS = 6 * 60 * 60 * 1000;
export const LIVE_LEAGUE_HISTORICAL_TTL_MS = 12 * 60 * 60 * 1000;
export const COVERAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const COMPLETED_SEASON_TTL_MS = 10 * 365 * 24 * 60 * 60 * 1000;

export function isCompletedSeason(season: number) {
  return season <= getCurrentFootballSeason() - 1;
}

export function teamDossierTtl(season: number) {
  return isCompletedSeason(season) ? COMPLETED_SEASON_TTL_MS : LIVE_TEAM_DOSSIER_TTL_MS;
}

export function leagueHistoricalTtl(season: number) {
  return isCompletedSeason(season) ? COMPLETED_SEASON_TTL_MS : LIVE_LEAGUE_HISTORICAL_TTL_MS;
}

export function coverageTtl(season: number) {
  return isCompletedSeason(season) ? COMPLETED_SEASON_TTL_MS : COVERAGE_TTL_MS;
}

function getCurrentFootballSeason() {
  const now = new Date();
  const calendarYear = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const inferredSeason = month >= 7 ? calendarYear : calendarYear - 1;
  return Math.min(serverConfig.apiFootballSeason, inferredSeason);
}
