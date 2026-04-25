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
