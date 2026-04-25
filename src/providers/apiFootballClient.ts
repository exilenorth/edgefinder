const API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";

export interface ApiFootballEnvelope<T> {
  get: string;
  parameters: Record<string, string>;
  errors: unknown[];
  results: number;
  paging: {
    current: number;
    total: number;
  };
  response: T;
}

export interface ApiFootballFixtureSummary {
  fixture: {
    id: number;
    date: string;
    venue?: {
      id?: number;
      name?: string;
    };
    status: {
      short: string;
    };
  };
  league: {
    id: number;
    name: string;
    logo?: string;
    season: number;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo?: string;
    };
    away: {
      id: number;
      name: string;
      logo?: string;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

export interface ApiFootballTeamRecord {
  team: {
    id: number;
    name: string;
    code?: string;
    country?: string;
    founded?: number;
    national?: boolean;
    logo?: string;
  };
  venue?: {
    id?: number;
    name?: string;
    address?: string;
    city?: string;
    capacity?: number;
    surface?: string;
    image?: string;
  };
}

export interface ApiFootballSquadRecord {
  team: {
    id: number;
    name: string;
    logo?: string;
  };
  players: Array<{
    id: number;
    name: string;
    age?: number;
    number?: number;
    position?: string;
    photo?: string;
  }>;
}

export interface ApiFootballCoachRecord {
  id?: number;
  name?: string;
  firstname?: string;
  lastname?: string;
  age?: number;
  birth?: {
    date?: string;
    place?: string;
    country?: string;
  };
  nationality?: string;
  height?: string;
  weight?: string;
  photo?: string;
}

export interface ApiFootballInjuryRecord {
  player: {
    id?: number;
    name: string;
    type?: string;
    reason?: string;
  };
  team: {
    id: number;
    name: string;
  };
  fixture?: {
    id: number;
    date: string;
  };
  league?: {
    id: number;
    season: number;
  };
}

export interface ApiFootballLineupRecord {
  team: {
    id: number;
    name: string;
    logo?: string;
  };
  formation?: string;
  startXI: Array<{
    player: {
      id?: number;
      name: string;
      number?: number;
      pos?: string;
      grid?: string;
    };
  }>;
}

export interface ApiFootballFixtureStatistic {
  team: {
    id: number;
    name: string;
  };
  statistics: Array<{
    type: string;
    value: string | number | null;
  }>;
}

export interface ApiFootballPlayerStatistics {
  team: {
    id: number;
    name: string;
  };
  players: Array<{
    player: {
      id: number;
      name: string;
    };
    statistics: unknown[];
  }>;
}

export class ApiFootballClient {
  constructor(private readonly apiKey: string) {}

  async listFixtures(query: {
    league: number;
    season: number;
    from?: string;
    to?: string;
    next?: number;
    last?: number;
    team?: number;
  }) {
    return this.request<ApiFootballFixtureSummary[]>("/fixtures", query);
  }

  async getFixture(id: number) {
    return this.request<ApiFootballFixtureSummary[]>("/fixtures", { id });
  }

  async getHeadToHead(homeTeamId: number, awayTeamId: number, last = 10) {
    return this.request<ApiFootballFixtureSummary[]>("/fixtures/headtohead", {
      h2h: `${homeTeamId}-${awayTeamId}`,
      last
    });
  }

  async getFixtureStatistics(fixtureId: number) {
    return this.request<ApiFootballFixtureStatistic[]>("/fixtures/statistics", { fixture: fixtureId });
  }

  async getFixturePlayers(fixtureId: number) {
    return this.request<ApiFootballPlayerStatistics[]>("/fixtures/players", { fixture: fixtureId });
  }

  async getTeamStatistics(query: { league: number; season: number; team: number }) {
    return this.request<unknown>("/teams/statistics", query);
  }

  async getTeams(query: { id?: number; name?: string; league?: number; season?: number }) {
    return this.request<ApiFootballTeamRecord[]>("/teams", query);
  }

  async getSquad(team: number) {
    return this.request<ApiFootballSquadRecord[]>("/players/squads", { team });
  }

  async getCoachs(team: number) {
    return this.request<ApiFootballCoachRecord[]>("/coachs", { team });
  }

  async getInjuries(query: { team: number; league?: number; season?: number; fixture?: number }) {
    return this.request<ApiFootballInjuryRecord[]>("/injuries", query);
  }

  async getLineups(fixture: number) {
    return this.request<ApiFootballLineupRecord[]>("/fixtures/lineups", { fixture });
  }

  async getPlayers(query: { league?: number; season: number; team?: number; player?: number; page?: number }) {
    return this.request<unknown>("/players", query);
  }

  private async request<T>(path: string, query: Record<string, string | number | undefined>) {
    const url = new URL(`${API_FOOTBALL_BASE_URL}${path}`);

    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });

    const response = await fetch(url, {
      headers: {
        "x-apisports-key": this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`API-Football request failed: ${response.status}`);
    }

    return (await response.json()) as ApiFootballEnvelope<T>;
  }
}
