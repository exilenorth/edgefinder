import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

dotenv.config({ path: path.join(rootDir, ".env.local") });
dotenv.config({ path: path.join(rootDir, ".env") });

function numberFromEnv(name: string, fallback: number) {
  const value = process.env[name];
  return value ? Number(value) : fallback;
}

export const serverConfig = {
  port: numberFromEnv("PORT", 8787),
  rootDir,
  dataDir: path.join(rootDir, "data"),
  cacheDbPath: path.join(rootDir, "data", "edgefinder-cache.sqlite"),
  apiFootballKey: process.env.API_FOOTBALL_KEY ?? process.env.VITE_API_FOOTBALL_KEY,
  oddsApiKey: process.env.THE_ODDS_API_KEY ?? process.env.VITE_THE_ODDS_API_KEY,
  apiFootballLeagueId: numberFromEnv("API_FOOTBALL_LEAGUE_ID", numberFromEnv("VITE_API_FOOTBALL_LEAGUE_ID", 39)),
  apiFootballSeason: numberFromEnv("API_FOOTBALL_SEASON", numberFromEnv("VITE_API_FOOTBALL_SEASON", 2026)),
  oddsSport: process.env.ODDS_SPORT ?? process.env.VITE_ODDS_SPORT ?? "soccer_epl",
  oddsRegions: process.env.ODDS_REGIONS ?? process.env.VITE_ODDS_REGIONS ?? "uk,eu",
  oddsMarkets: process.env.ODDS_MARKETS ?? process.env.VITE_ODDS_MARKETS ?? "h2h,totals",
  oddsBookmakers: process.env.ODDS_BOOKMAKERS ?? process.env.VITE_ODDS_BOOKMAKERS
};
