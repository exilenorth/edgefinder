export interface ApiConfig {
  oddsApiKey?: string;
  apiFootballKey?: string;
  oddsSport: string;
  oddsRegions: string;
  oddsMarkets: string;
  oddsBookmakers?: string;
  apiFootballLeagueId: number;
  apiFootballSeason: number;
}

export const apiConfig: ApiConfig = {
  oddsApiKey: import.meta.env.VITE_THE_ODDS_API_KEY,
  apiFootballKey: import.meta.env.VITE_API_FOOTBALL_KEY,
  oddsSport: import.meta.env.VITE_ODDS_SPORT ?? "soccer_epl",
  oddsRegions: import.meta.env.VITE_ODDS_REGIONS ?? "uk,eu",
  oddsMarkets: import.meta.env.VITE_ODDS_MARKETS ?? "h2h,totals",
  oddsBookmakers: import.meta.env.VITE_ODDS_BOOKMAKERS || undefined,
  apiFootballLeagueId: Number(import.meta.env.VITE_API_FOOTBALL_LEAGUE_ID ?? 39),
  apiFootballSeason: Number(import.meta.env.VITE_API_FOOTBALL_SEASON ?? new Date().getFullYear())
};
