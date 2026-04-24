const THE_ODDS_API_BASE_URL = "https://api.the-odds-api.com/v4";

export interface OddsApiQuota {
  requestsRemaining?: string;
  requestsUsed?: string;
  requestsLast?: string;
}

export interface OddsApiSport {
  key: string;
  group: string;
  title: string;
  description: string;
  active: boolean;
  has_outrights: boolean;
}

export interface OddsApiOutcome {
  name: string;
  price: number;
  point?: number;
}

export interface OddsApiMarket {
  key: string;
  last_update?: string;
  outcomes: OddsApiOutcome[];
}

export interface OddsApiBookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: OddsApiMarket[];
}

export interface OddsApiEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: OddsApiBookmaker[];
}

export interface OddsRequest {
  sport: string;
  regions?: string;
  markets?: string;
  bookmakers?: string;
  oddsFormat?: "decimal" | "american";
  dateFormat?: "iso" | "unix";
  eventIds?: string[];
  commenceTimeFrom?: string;
  commenceTimeTo?: string;
}

export class TheOddsApiClient {
  constructor(private readonly apiKey: string) {}

  async listSports() {
    return this.request<OddsApiSport[]>("/sports", {});
  }

  async listOdds(options: OddsRequest) {
    const { sport, ...query } = options;
    return this.request<OddsApiEvent[]>(`/sports/${sport}/odds`, {
      oddsFormat: "decimal",
      dateFormat: "iso",
      ...query,
      eventIds: query.eventIds?.join(",")
    });
  }

  async listEvents(sport: string) {
    return this.request<Omit<OddsApiEvent, "bookmakers">[]>(`/sports/${sport}/events`, {});
  }

  async getEventOdds(eventId: string, options: Omit<OddsRequest, "eventIds">) {
    const { sport, ...query } = options;
    return this.request<OddsApiEvent>(`/sports/${sport}/events/${eventId}/odds`, {
      oddsFormat: "decimal",
      dateFormat: "iso",
      ...query
    });
  }

  private async request<T>(path: string, query: Record<string, string | undefined>) {
    const url = new URL(`${THE_ODDS_API_BASE_URL}${path}`);
    url.searchParams.set("apiKey", this.apiKey);

    Object.entries(query).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`The Odds API request failed: ${response.status}`);
    }

    return {
      data: (await response.json()) as T,
      quota: {
        requestsRemaining: response.headers.get("x-requests-remaining") ?? undefined,
        requestsUsed: response.headers.get("x-requests-used") ?? undefined,
        requestsLast: response.headers.get("x-requests-last") ?? undefined
      }
    };
  }
}
