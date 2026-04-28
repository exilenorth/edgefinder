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
    appearances?: number;
    lineups?: number;
    minutes?: number;
    goals?: number;
    assists?: number;
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
  transfers: Array<{
    player: string;
    date?: string;
    type?: string;
    in?: string;
    out?: string;
    direction: "in" | "out" | "other";
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
  dataStatus: ResearchDataStatus;
}

export interface LeagueHistoricalDossier {
  league: {
    id: number;
    season: number;
    name?: string;
    logo?: string;
  };
  coverage?: {
    fixtures?: {
      events?: boolean;
      lineups?: boolean;
      statisticsFixtures?: boolean;
      statisticsPlayers?: boolean;
    };
    standings?: boolean;
    players?: boolean;
    topScorers?: boolean;
    topAssists?: boolean;
    injuries?: boolean;
    predictions?: boolean;
    odds?: boolean;
  };
  standings: Array<{
    rank: number;
    teamId: number;
    team: string;
    logo?: string;
    played?: number;
    wins?: number;
    draws?: number;
    losses?: number;
    goalsFor?: number;
    goalsAgainst?: number;
    goalDifference?: number;
    points?: number;
    form?: string;
  }>;
  topScorers: Array<{
    playerId: number;
    player: string;
    team: string;
    photo?: string;
    goals?: number;
    assists?: number;
    appearances?: number;
    minutes?: number;
  }>;
  topAssists: Array<{
    playerId: number;
    player: string;
    team: string;
    photo?: string;
    assists?: number;
    goals?: number;
    appearances?: number;
    minutes?: number;
  }>;
  dataStatus: ResearchDataStatus;
}

export interface ResearchDataStatus {
  source: "live" | "partial" | "unavailable";
  season: number;
  requestedSeason?: number;
  resolvedSeason?: number;
  fallbackSeasonUsed?: boolean;
  completeness?: "complete" | "partial" | "unavailable";
  archiveEligible?: boolean;
  missingData?: string[];
  errors: string[];
  refreshedAt: string;
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
