export type Result = "W" | "D" | "L";

export interface TeamSnapshot {
  id: string;
  name: string;
  logoUrl?: string;
  attackRating: number;
  defenceRating: number;
  form: {
    results: Result[];
    goalsFor: number;
    goalsAgainst: number;
    xgFor: number;
    xgAgainst: number;
  };
  players: PlayerSnapshot[];
}

export interface PlayerSnapshot {
  id: string;
  name: string;
  position: string;
  startsLikely: boolean;
  seasonXgPer90: number;
  recentXgPer90: number;
  anytimeOdds?: number;
}

export interface HeadToHeadMatch {
  date: string;
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
  homeXg: number;
  awayXg: number;
}

export interface Fixture {
  id: string;
  competition: string;
  competitionLogoUrl?: string;
  kickoff: string;
  venue: string;
  venueImageUrl?: string;
  home: TeamSnapshot;
  away: TeamSnapshot;
  marketOdds: {
    home: number;
    draw: number;
    away: number;
    over25?: number;
    btts?: number;
  };
  headToHead: HeadToHeadMatch[];
}

export interface TeamDossier {
  team: {
    id: number;
    name: string;
    logo?: string;
    founded?: number;
    country?: string;
  };
  league: {
    id: number;
    season: number;
  };
  venue?: {
    id?: number;
    name?: string;
    city?: string;
    capacity?: number;
    surface?: string;
    image?: string;
  };
  squad: Array<{
    id: number;
    name: string;
    age?: number;
    number?: number;
    position?: string;
    photo?: string;
  }>;
  coach?: {
    id?: number;
    name?: string;
    age?: number;
    nationality?: string;
    photo?: string;
  };
  injuries: Array<{
    player: string;
    reason?: string;
    type?: string;
    fixture?: string;
  }>;
  recentFixtures: Array<{
    id: number;
    date: string;
    home: string;
    away: string;
    homeGoals?: number | null;
    awayGoals?: number | null;
    venue?: string;
  }>;
  recentLineups: Array<{
    fixtureId: number;
    date: string;
    opponent: string;
    formation?: string;
    startXI: string[];
  }>;
  statistics?: unknown;
  dataStatus: {
    source: "live" | "partial" | "unavailable";
    season: number;
    errors: string[];
    refreshedAt: string;
  };
}

export interface MarketSelection {
  label: string;
  context?: string;
  probability: number;
  fairOdds: number;
  marketOdds?: number;
  edge: number;
  note?: string;
}
