import type { Fixture, HeadToHeadMatch, PlayerSnapshot, Result, TeamSnapshot } from "../../src/types";
import { ApiFootballClient, type ApiFootballFixtureSummary } from "../../src/providers/apiFootballClient";
import { mockProvider } from "../../src/providers/mockProvider";
import { TheOddsApiClient, type OddsApiEvent, type OddsApiMarket } from "../../src/providers/theOddsApiClient";
import { serverConfig } from "../config";

const FIXTURE_LIST_TTL_MS = 15 * 60 * 1000;
const FIXTURE_DETAIL_TTL_MS = 60 * 60 * 1000;

interface FixtureServiceDeps {
  cache: {
    getOrSet<T>(key: string, ttlMs: number, fetchFresh: () => Promise<T>): Promise<{ value: T; source: "cache" | "live" }>;
  };
  fixtureSync?: {
    syncFixtures(fixtures: Fixture[], source?: "live" | "cache" | "mock"): void;
  };
  oddsSync?: {
    syncOddsEvents(events: OddsApiEvent[], fixtures: Fixture[], capturedAt?: number): void;
  };
  providerRequests?: {
    record(request: {
      provider: string;
      endpoint: string;
      requestKey: string;
      status: "success" | "failure";
      source?: string;
      error?: string;
      responseRef?: string;
      requestedAt?: number;
    }): void;
  };
}

export class LiveFixtureService {
  private readonly football?: ApiFootballClient;
  private readonly odds?: TheOddsApiClient;

  constructor(private readonly deps: FixtureServiceDeps) {
    this.football = serverConfig.apiFootballKey
      ? new ApiFootballClient(serverConfig.apiFootballKey, { minIntervalMs: serverConfig.apiFootballMinIntervalMs })
      : undefined;
    this.odds = serverConfig.oddsApiKey ? new TheOddsApiClient(serverConfig.oddsApiKey) : undefined;
  }

  async listFixtures() {
    const result = await this.deps.cache.getOrSet(
      `live:fixtures:v3:${serverConfig.apiFootballLeagueId}:${serverConfig.apiFootballSeason}:${serverConfig.oddsSport}`,
      FIXTURE_LIST_TTL_MS,
      async () => {
        if (!this.football || !this.odds) {
          return mockProvider.listFixtures();
        }

        try {
          const [fixtureEnvelope, oddsEnvelope] = await Promise.all([
            this.listUpcomingFootballFixtures(),
            this.odds.listOdds({
              sport: serverConfig.oddsSport,
              regions: serverConfig.oddsRegions,
              markets: serverConfig.oddsMarkets,
              bookmakers: serverConfig.oddsBookmakers || undefined,
              oddsFormat: "decimal",
              dateFormat: "iso"
            })
          ]);

          const oddsEvents = oddsEnvelope.data;
          if (fixtureEnvelope.response.length === 0) {
            const mapped = oddsEvents.length > 0 ? oddsEvents.map(mapOddsEventFixture) : await mockProvider.listFixtures();
            this.deps.oddsSync?.syncOddsEvents(oddsEvents, mapped);
            return mapped;
          }

          const mapped = fixtureEnvelope.response.map((fixture) => mapFixture(fixture, matchOddsEvent(fixture, oddsEvents)));
          this.deps.oddsSync?.syncOddsEvents(oddsEvents, mapped);
          return mapped;
        } catch (error) {
          console.warn("Live fixture fetch failed; falling back to mock fixtures", error);
          return mockProvider.listFixtures();
        }
      }
    );

    this.deps.fixtureSync?.syncFixtures(result.value, result.source);
    this.deps.providerRequests?.record({
      provider: "edgefinder",
      endpoint: "listFixtures",
      requestKey: `${serverConfig.apiFootballLeagueId}:${serverConfig.apiFootballSeason}:${serverConfig.oddsSport}`,
      status: "success",
      source: result.source,
      responseRef: `fixtures:${result.value.length}`
    });
    return result;
  }

  async getFixture(id: string) {
    const result = await this.deps.cache.getOrSet(`live:fixture:${id}`, FIXTURE_DETAIL_TTL_MS, async () => {
      if (id.startsWith("odds-api:")) {
        const fixtures = await this.listFixtures();
        return fixtures.value.find((fixture) => fixture.id === id);
      }

      if (!this.football || !id.startsWith("api-football:")) {
        return mockProvider.getFixture(id);
      }

      const fixtureId = Number(id.replace("api-football:", ""));
      const fixtureEnvelope = await this.football.getFixture(fixtureId);
      const fixture = fixtureEnvelope.response[0];
      if (!fixture) return undefined;

      const oddsEnvelope = this.odds
        ? await this.odds.listOdds({
            sport: serverConfig.oddsSport,
            regions: serverConfig.oddsRegions,
            markets: serverConfig.oddsMarkets,
            bookmakers: serverConfig.oddsBookmakers || undefined,
            eventIds: [],
            oddsFormat: "decimal",
            dateFormat: "iso"
          })
        : undefined;

      const mapped = mapFixture(fixture, oddsEnvelope ? matchOddsEvent(fixture, oddsEnvelope.data) : undefined);
      if (oddsEnvelope) {
        this.deps.oddsSync?.syncOddsEvents(oddsEnvelope.data, [mapped]);
      }
      mapped.headToHead = await this.getHeadToHead(fixture);
      return mapped;
    });

    if (result.value) {
      this.deps.fixtureSync?.syncFixtures([result.value], result.source);
    }
    this.deps.providerRequests?.record({
      provider: "edgefinder",
      endpoint: "getFixture",
      requestKey: id,
      status: result.value ? "success" : "failure",
      source: result.source,
      responseRef: result.value?.id,
      error: result.value ? undefined : "Fixture not found"
    });

    return result;
  }

  private async getHeadToHead(fixture: ApiFootballFixtureSummary): Promise<HeadToHeadMatch[]> {
    if (!this.football) return [];

    try {
      const envelope = await this.football.getHeadToHead(fixture.teams.home.id, fixture.teams.away.id, 5);
      return envelope.response
        .filter((match) => match.fixture.id !== fixture.fixture.id && match.goals.home !== null && match.goals.away !== null)
        .slice(0, 5)
        .map((match) => ({
          date: match.fixture.date.slice(0, 10),
          home: match.teams.home.name,
          away: match.teams.away.name,
          homeGoals: match.goals.home ?? 0,
          awayGoals: match.goals.away ?? 0,
          homeXg: estimateHistoricalXg(match.goals.home ?? 0),
          awayXg: estimateHistoricalXg(match.goals.away ?? 0)
        }));
    } catch (error) {
      console.warn("Head-to-head fetch failed", error);
      return [];
    }
  }

  private async listUpcomingFootballFixtures() {
    if (!this.football) {
      throw new Error("API-Football client is not configured");
    }

    const configuredSeason = await this.football.listFixtures({
      league: serverConfig.apiFootballLeagueId,
      season: serverConfig.apiFootballSeason,
      next: 12
    });

    if (configuredSeason.response.length > 0) {
      return configuredSeason;
    }

    return this.football.listFixtures({
      league: serverConfig.apiFootballLeagueId,
      season: serverConfig.apiFootballSeason - 1,
      next: 12
    });
  }
}

function mapOddsEventFixture(event: OddsApiEvent): Fixture {
  const marketOdds = extractOddsEventMarketOdds(event);
  return {
    id: `odds-api:${event.id}`,
    competition: event.sport_title,
    kickoff: event.commence_time,
    venue: "TBC",
    home: createTeamSnapshotFromOdds(event.home_team, true, marketOdds.home),
    away: createTeamSnapshotFromOdds(event.away_team, false, marketOdds.away),
    marketOdds,
    headToHead: []
  };
}

function mapFixture(fixture: ApiFootballFixtureSummary, oddsEvent?: OddsApiEvent): Fixture {
  const marketOdds = extractMarketOdds(fixture, oddsEvent);
  const home = createTeamSnapshot(fixture.teams.home.id, fixture.teams.home.name, true, marketOdds.home, fixture.teams.home.logo);
  const away = createTeamSnapshot(fixture.teams.away.id, fixture.teams.away.name, false, marketOdds.away, fixture.teams.away.logo);

  return {
    id: `api-football:${fixture.fixture.id}`,
    competition: fixture.league.name,
    competitionLogoUrl: fixture.league.logo,
    kickoff: fixture.fixture.date,
    venue: fixture.fixture.venue?.name ?? "TBC",
    venueImageUrl: fixture.fixture.venue?.id
      ? `https://media.api-sports.io/football/venues/${fixture.fixture.venue.id}.png`
      : undefined,
    home,
    away,
    marketOdds,
    headToHead: []
  };
}

function createTeamSnapshot(id: number, name: string, isHome: boolean, winOdds: number, logoUrl?: string): TeamSnapshot {
  const impliedStrength = Math.min(Math.max(1 / winOdds, 0.18), 0.62);
  const attackRating = 1.1 + impliedStrength * 1.2 + (isHome ? 0.08 : 0);
  const defenceRating = 0.9 + impliedStrength * 0.6;

  return {
    id: String(id),
    name,
    logoUrl,
    attackRating,
    defenceRating,
    form: createNeutralForm(attackRating, defenceRating),
    players: createPlaceholderPlayers(name)
  };
}

function createTeamSnapshotFromOdds(name: string, isHome: boolean, winOdds: number): TeamSnapshot {
  const impliedStrength = Math.min(Math.max(1 / winOdds, 0.18), 0.62);
  const attackRating = 1.05 + impliedStrength * 1.25 + (isHome ? 0.08 : 0);
  const defenceRating = 0.88 + impliedStrength * 0.58;

  return {
    id: slugify(name),
    name,
    attackRating,
    defenceRating,
    form: createNeutralForm(attackRating, defenceRating),
    players: createPlaceholderPlayers(name)
  };
}

function createNeutralForm(attackRating: number, defenceRating: number) {
  return {
    results: ["D", "D", "D", "D", "D"] as Result[],
    goalsFor: Math.round(attackRating * 5),
    goalsAgainst: Math.round((2 - defenceRating) * 5),
    xgFor: attackRating * 5,
    xgAgainst: Math.max(0.8, 2 - defenceRating) * 5
  };
}

function createPlaceholderPlayers(teamName: string): PlayerSnapshot[] {
  return [
    {
      id: `${slugify(teamName)}-primary-forward`,
      name: `${teamName} main forward`,
      position: "FW",
      startsLikely: true,
      seasonXgPer90: 0.42,
      recentXgPer90: 0.42
    },
    {
      id: `${slugify(teamName)}-wide-forward`,
      name: `${teamName} wide forward`,
      position: "FW",
      startsLikely: true,
      seasonXgPer90: 0.28,
      recentXgPer90: 0.28
    },
    {
      id: `${slugify(teamName)}-midfielder`,
      name: `${teamName} attacking midfielder`,
      position: "AM",
      startsLikely: true,
      seasonXgPer90: 0.18,
      recentXgPer90: 0.18
    }
  ];
}

function extractMarketOdds(fixture: ApiFootballFixtureSummary, oddsEvent?: OddsApiEvent): Fixture["marketOdds"] {
  const h2h = findMarket(oddsEvent, "h2h");
  const totals = findMarket(oddsEvent, "totals");
  const home = h2h?.outcomes.find((outcome) => sameTeam(outcome.name, fixture.teams.home.name))?.price ?? 2.1;
  const away = h2h?.outcomes.find((outcome) => sameTeam(outcome.name, fixture.teams.away.name))?.price ?? 3.4;
  const draw = h2h?.outcomes.find((outcome) => outcome.name.toLowerCase() === "draw")?.price ?? 3.3;
  const over25 = totals?.outcomes.find((outcome) => outcome.name.toLowerCase() === "over" && outcome.point === 2.5)?.price;

  return {
    home,
    draw,
    away,
    over25
  };
}

function extractOddsEventMarketOdds(oddsEvent: OddsApiEvent): Fixture["marketOdds"] {
  const h2h = findMarket(oddsEvent, "h2h");
  const totals = findMarket(oddsEvent, "totals");
  const home = h2h?.outcomes.find((outcome) => sameTeam(outcome.name, oddsEvent.home_team))?.price ?? 2.1;
  const away = h2h?.outcomes.find((outcome) => sameTeam(outcome.name, oddsEvent.away_team))?.price ?? 3.4;
  const draw = h2h?.outcomes.find((outcome) => outcome.name.toLowerCase() === "draw")?.price ?? 3.3;
  const over25 = totals?.outcomes.find((outcome) => outcome.name.toLowerCase() === "over" && outcome.point === 2.5)?.price;

  return {
    home,
    draw,
    away,
    over25
  };
}

function findMarket(oddsEvent: OddsApiEvent | undefined, key: string): OddsApiMarket | undefined {
  return oddsEvent?.bookmakers
    ?.flatMap((bookmaker) => bookmaker.markets)
    .find((market) => market.key === key);
}

function matchOddsEvent(fixture: ApiFootballFixtureSummary, oddsEvents: OddsApiEvent[]) {
  return oddsEvents.find((event) => {
    const kickoffDelta = Math.abs(new Date(event.commence_time).getTime() - new Date(fixture.fixture.date).getTime());
    return (
      kickoffDelta <= 3 * 60 * 60 * 1000 &&
      sameTeam(event.home_team, fixture.teams.home.name) &&
      sameTeam(event.away_team, fixture.teams.away.name)
    );
  });
}

function sameTeam(a: string, b: string) {
  const first = slugify(a);
  const second = slugify(b);
  return first === second || first.includes(second) || second.includes(first);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function estimateHistoricalXg(goals: number) {
  return Math.max(0.4, goals * 0.75 + 0.45);
}
