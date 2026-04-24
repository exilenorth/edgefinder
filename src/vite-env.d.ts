/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_THE_ODDS_API_KEY?: string;
  readonly VITE_API_FOOTBALL_KEY?: string;
  readonly VITE_ODDS_SPORT?: string;
  readonly VITE_ODDS_REGIONS?: string;
  readonly VITE_ODDS_MARKETS?: string;
  readonly VITE_ODDS_BOOKMAKERS?: string;
  readonly VITE_API_FOOTBALL_LEAGUE_ID?: string;
  readonly VITE_API_FOOTBALL_SEASON?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
