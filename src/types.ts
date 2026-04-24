export type Result = "W" | "D" | "L";

export interface TeamSnapshot {
  id: string;
  name: string;
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
  kickoff: string;
  venue: string;
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

export interface MarketSelection {
  label: string;
  context?: string;
  probability: number;
  fairOdds: number;
  marketOdds?: number;
  edge: number;
  note?: string;
}
