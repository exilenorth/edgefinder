const API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";

interface ApiFootballClientOptions {
  minIntervalMs?: number;
}

let sharedLastRequestAt = 0;
let sharedRequestQueue = Promise.resolve();

export interface ApiFootballEnvelope<T> {
  get: string;
  parameters: Record<string, string>;
  errors: unknown[] | Record<string, string>;
  results: number;
  paging: {
    current: number;
    total: number;
  };
  response: T;
}

export interface ApiFootballLeagueRecord {
  league: {
    id: number;
    name: string;
    type?: string;
    logo?: string;
  };
  country?: {
    name?: string;
    code?: string;
    flag?: string;
  };
  seasons: Array<{
    year: number;
    current: boolean;
    coverage?: {
      fixtures?: {
        events?: boolean;
        lineups?: boolean;
        statistics_fixtures?: boolean;
        statistics_players?: boolean;
      };
      standings?: boolean;
      players?: boolean;
      top_scorers?: boolean;
      top_assists?: boolean;
      injuries?: boolean;
      predictions?: boolean;
      odds?: boolean;
    };
  }>;
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

export interface ApiFootballSeasonPlayerRecord {
  player: {
    id: number;
    name: string;
    firstname?: string;
    lastname?: string;
    age?: number;
    nationality?: string;
    height?: string;
    weight?: string;
    injured?: boolean;
    photo?: string;
  };
  statistics: Array<{
    team?: {
      id: number;
      name: string;
      logo?: string;
    };
    league?: {
      id: number;
      name: string;
      season: number;
    };
    games?: {
      number?: number;
      position?: string;
      appearences?: number;
      lineups?: number;
      minutes?: number;
    };
    goals?: {
      total?: number;
      assists?: number;
    };
  }>;
}

export interface ApiFootballStandingRecord {
  league: {
    id: number;
    name: string;
    season: number;
    logo?: string;
    standings: Array<
      Array<{
        rank: number;
        team: {
          id: number;
          name: string;
          logo?: string;
        };
        points?: number;
        goalsDiff?: number;
        form?: string;
        all?: {
          played?: number;
          win?: number;
          draw?: number;
          lose?: number;
          goals?: {
            for?: number;
            against?: number;
          };
        };
      }>
    >;
  };
}

export interface ApiFootballTransferRecord {
  player: {
    id?: number;
    name: string;
  };
  transfers: Array<{
    date?: string;
    type?: string;
    teams?: {
      in?: {
        id?: number;
        name?: string;
        logo?: string;
      };
      out?: {
        id?: number;
        name?: string;
        logo?: string;
      };
    };
  }>;
}

export class ApiFootballClient {
  constructor(private readonly apiKey: string, private readonly options: ApiFootballClientOptions = {}) {}

  async getLeagues(query: { id?: number; season?: number; current?: boolean }) {
    return this.request<ApiFootballLeagueRecord[]>("/leagues", {
      id: query.id,
      season: query.season,
      current: query.current === undefined ? undefined : query.current ? "true" : "false"
    });
  }

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
    return this.request<ApiFootballSeasonPlayerRecord[]>("/players", query);
  }

  async getStandings(query: { league: number; season: number; team?: number }) {
    return this.request<ApiFootballStandingRecord[]>("/standings", query);
  }

  async getTopScorers(query: { league: number; season: number }) {
    return this.request<ApiFootballSeasonPlayerRecord[]>("/players/topscorers", query);
  }

  async getTopAssists(query: { league: number; season: number }) {
    return this.request<ApiFootballSeasonPlayerRecord[]>("/players/topassists", query);
  }

  async getTransfers(query: { team?: number; player?: number }) {
    return this.request<ApiFootballTransferRecord[]>("/transfers", query);
  }

  private async request<T>(path: string, query: Record<string, string | number | undefined>) {
    const url = new URL(`${API_FOOTBALL_BASE_URL}${path}`);

    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });

    const response = await this.enqueueRequest(() =>
      fetch(url, {
        headers: {
          "x-apisports-key": this.apiKey
        }
      })
    );

    if (!response.ok) {
      throw new Error(`API-Football request failed: ${response.status}`);
    }

    const envelope = (await response.json()) as ApiFootballEnvelope<T>;
    if (hasApiErrors(envelope.errors)) {
      throw new Error(`API-Football returned errors: ${formatApiErrors(envelope.errors)}`);
    }

    return envelope;
  }

  private enqueueRequest<T>(run: () => Promise<T>) {
    const queued = sharedRequestQueue.then(async () => {
      const minIntervalMs = this.options.minIntervalMs ?? 0;
      const elapsed = Date.now() - sharedLastRequestAt;
      if (elapsed < minIntervalMs) {
        await delay(minIntervalMs - elapsed);
      }

      sharedLastRequestAt = Date.now();
      return run();
    });

    sharedRequestQueue = queued.then(
      () => undefined,
      () => undefined
    );

    return queued;
  }
}

function delay(ms: number) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

function hasApiErrors(errors: ApiFootballEnvelope<unknown>["errors"]) {
  return Array.isArray(errors) ? errors.length > 0 : Object.keys(errors).length > 0;
}

function formatApiErrors(errors: ApiFootballEnvelope<unknown>["errors"]) {
  return Array.isArray(errors) ? errors.join(", ") : Object.entries(errors).map(([key, value]) => `${key}: ${value}`).join(", ");
}
