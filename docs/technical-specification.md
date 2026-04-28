# EdgeFinder Technical Specification

Last updated: 28 April 2026.

## Overview

EdgeFinder is a TypeScript React app with a local Express backend. The frontend provides the betting decision and research UI. The backend protects API keys, calls external sports providers, applies cache/archive policy, and exposes local `/api` endpoints.

## Runtime Stack

- Frontend: React 18, Vite, TypeScript.
- Backend: Express 5, TypeScript, `tsx`.
- Local persistence: `sql.js`-backed SQLite-compatible cache.
- Icons: `lucide-react`.
- External providers: API-Football and The Odds API.

## Application Entry Points

- `src/main.tsx`: React bootstrap.
- `src/app/App.tsx`: app state, navigation state, fixture loading, follows, and Assistant/Research orchestration.
- `server/index.ts`: Express server, cache initialization, API routes.

## Frontend Structure

```txt
src/
  app/
    App.tsx
    Sidebar.tsx
    types.ts
  components/
    DataFreshnessChip.tsx
    FollowToggle.tsx
    LogoMark.tsx
    Metric.tsx
    Panel.tsx
  features/
    assistant/
      AssistantSidebarContent.tsx
      BettingAssistantWorkspace.tsx
      BetThesisPanel.tsx
      OpportunityDashboard.tsx
      ReasoningPanels.tsx
      thesis.ts
    research/
      ResearchHubWorkspace.tsx
      ResearchSidebarContent.tsx
  model/
    probability.ts
  providers/
    backendProvider.ts
    cachedProvider.ts
    apiFootballClient.ts
    theOddsApiClient.ts
    mockProvider.ts
  utils/
    fixtureFilters.ts
    follows.ts
    formatting.ts
    researchSummaries.ts
    teamAssets.ts
```

## Backend Structure

```txt
server/
  index.ts
  config.ts
  cache/
    sqliteCache.ts
  db/
    migrations.ts
    types.ts
  repositories/
    domainStatsRepository.ts
    fixturesRepository.ts
    leaguesRepository.ts
    oddsRepository.ts
    opportunitiesRepository.ts
    providerRequestsRepository.ts
    teamsRepository.ts
  services/
    liveFixtureService.ts
    leagueHistoricalService.ts
    seasonCachePolicy.ts
    teamDossierService.ts
  sync/
    fixtureSnapshotSync.ts
    oddsSnapshotSync.ts
  audit/
    auditDb.ts
    fieldPathExtractor.ts
    http.ts
    report.ts
    types.ts
```

## Core App State

`App.tsx` owns:

- Loaded fixtures.
- Selected fixture ID and selected fixture detail.
- Assistant filters.
- Expanded fixture sidebar groups.
- Current app view: `assistant` or `research`.
- Selected research entity.
- In-app navigation history.
- Followed leagues and teams.
- Cache event metadata from the frontend cache provider.

URL state is encoded using query parameters:

- `view=assistant|research`
- `fixture=...`
- `entity=league|team|player|fixture`
- `entityName=...`
- `entityId=...` for non-league entities.

The browser URL is updated with `history.pushState` or `history.replaceState`, and `popstate` is handled to support browser back/forward.

## Frontend Data Flow

1. `App` creates `fixtureProvider` from `createCachedSportsDataProvider(backendProvider, ...)`.
2. The provider calls backend endpoints under `/api`.
3. Responses are cached in IndexedDB using short TTLs.
4. `App` builds league/team summaries from loaded fixtures.
5. The selected fixture is passed to `analyseFixture`.
6. Assistant builds the thesis and opportunity dashboard from fixture analysis.
7. Research Hub uses fixture summaries, curated EPL profiles, and backend dossier endpoints.

## Backend API

### `GET /api/health`

Returns backend health and provider-key configuration flags.

### `GET /api/db/summary`

Returns row counts for the normalized local database tables. This is a developer sanity endpoint for confirming that fixture refreshes are writing leagues, seasons, teams, fixtures, odds snapshots, opportunities, and opportunity snapshots.

### `GET /api/fixtures`

Returns upcoming fixtures.

Service: `LiveFixtureService.listFixtures()`.

Behaviour:

- Reads from backend cache first.
- Calls API-Football upcoming fixtures for configured league/season.
- Falls back to the previous season if configured current season returns no fixtures.
- Calls The Odds API for odds.
- Matches odds events to API-Football fixtures by team names and kickoff time.
- If API-Football returns no fixtures but odds are available, maps odds events into fixture snapshots.
- Falls back to mock fixtures if live provider flow fails.

### `GET /api/fixtures/:id`

Returns one fixture detail.

Behaviour:

- Supports `api-football:` fixture IDs.
- Supports `odds-api:` IDs by looking up the fixture list.
- Fetches API-Football fixture detail where available.
- Fetches head-to-heads for API-Football fixtures.
- Returns mock fixture details for unsupported/mock IDs.

### `GET /api/fixtures/:id/odds-movement`

Returns normalized odds movement rows for a fixture from `odds_snapshots`.

Each row contains bookmaker, market, outcome, first observed price, latest observed price, price change, first/latest capture timestamps, snapshot count, and provider last-update metadata.

This endpoint is currently a developer/read-model endpoint. It is intended to power future Assistant edge-decay UI.

### `GET /api/teams/:id/dossier`

Returns a team dossier.

Query parameters:

- `name`
- `league`
- `season`

Includes, where available:

- Team profile.
- Venue.
- Squad/player season stats.
- Coach.
- Team statistics.
- Injuries.
- Transfers.
- Recent fixtures.
- Recent lineups.
- Data status and provider errors.

Completed seasons are eligible for historical archive storage.

### `GET /api/leagues/:id/historical`

Returns a historical league dossier.

Query parameters:

- `season`

Includes, where available:

- League metadata.
- Coverage flags.
- Standings.
- Top scorers.
- Top assists.
- Data status and provider errors.

Completed seasons are eligible for historical archive storage.

## Cache And Archive Policy

Current cache layers:

- Frontend IndexedDB cache for UI fetches.
- Backend SQLite-compatible cache for provider responses and historical archives.
- Backend normalized tables for domain entities and snapshots.

Current TTL examples:

- Fixture list: 15 minutes.
- Fixture detail: 1 hour.
- Historical completed-season data: archived after successful fetch.
- Coverage and dossier TTLs are controlled by `seasonCachePolicy.ts`.

Important rule:

Completed season data should generally be treated as static. After a successful provider fetch, it should be archived locally and reused without repeated provider calls unless a manual refresh is explicitly added.

## Normalized Local Database

The backend now runs schema migrations against the same local SQLite-compatible file used by the response cache. The normalized layer sits beside the existing cache instead of replacing it.

Current normalized tables:

- `provider_requests`
- `leagues`
- `league_seasons`
- `venues`
- `teams`
- `fixtures`
- `fixture_teams`
- `odds_events`
- `odds_snapshots`
- `opportunities`
- `opportunity_snapshots`

Current write path:

1. Backend startup initializes `SqliteCache`.
2. `runMigrations(cache)` creates any missing normalized tables.
3. `LiveFixtureService` keeps returning fixtures through the existing cache/provider path.
4. During live fixture refreshes, `OddsSnapshotSync` writes raw The Odds API bookmaker events into `odds_events` and `odds_snapshots`.
5. After fixture list/detail reads, `FixtureSnapshotSync` writes normalized league, season, venue, team, fixture, attached odds, and best-opportunity snapshot records.
6. `ProviderRequestsRepository` records fixture service calls.

Current read path:

- The UI still reads through the existing `/api/fixtures` and `/api/fixtures/:id` endpoints.
- The normalized tables are not yet the source of truth for the UI.

Next read-path target:

- Add UI surfaces for odds movement, opportunity history, saved opportunities, and model audit views.

## Provider Configuration

Environment variables:

```txt
THE_ODDS_API_KEY
API_FOOTBALL_KEY
VITE_THE_ODDS_API_KEY
VITE_API_FOOTBALL_KEY
```

Backend keys should be the authoritative production path. Browser-exposed `VITE_*` keys are legacy/dev-only and should not be used for deployed provider calls.

Other config values live in `server/config.ts` and `src/config/apiConfig.ts`, including:

- API-Football league ID.
- API-Football season.
- Odds API sport key.
- Odds regions.
- Odds markets.
- Backend port.
- Cache DB path.

## Current Model

Model file: `src/model/probability.ts`.

The model:

- Estimates home and away expected goals from attack ratings, defence ratings, form xG proxies, and home advantage.
- Builds a normalized Poisson scoreline matrix.
- Produces 1X2 probabilities.
- Produces over 2.5 and BTTS probabilities.
- Produces likely scorelines.
- Produces anytime scorer probabilities from player xG-per-90 proxies.
- Converts probabilities into fair odds.
- Calculates edge as model probability minus market implied probability.
- Assigns Low/Medium confidence based on available H2H and likely starters.

Limitations:

- This is not shot-location xG.
- Current live fixture snapshots often contain placeholder form/player values.
- Model output is not persisted.
- No calibration or backtesting exists yet.

## Assistant Specification

The Assistant is a scan-first decision workspace.

Current order:

1. Edge Dashboard.
2. Fixture header.
3. Decision grid:
   - Bet Thesis.
   - Reasons.
   - What could kill this edge?
   - Best argument against this bet.
4. Result probabilities.
5. Collapsible evidence panels:
   - Team Form.
   - Goal Projection.
   - Head To Head.
   - Likely Scorelines.
   - Anytime Scorers.
6. Track this follow controls.
7. Decision-support disclaimer.

Opportunity statuses:

- Candidate.
- Watch.
- No clear edge.
- Stale.

Current dashboard filters:

- All.
- Today.
- 24h.
- Weekend.
- Following.
- Positive edge.

## Research Hub Specification

The Research Hub is the evidence workspace.

Current controls:

- Search.
- Followed only.
- Current/Historical mode.
- Season selector.
- Leagues/Teams/Players tabs.

Current League detail includes:

- Overview metrics.
- Teams.
- Upcoming fixtures.
- Coverage/data availability.

Historical League detail includes:

- Final league table.
- Top scorers.
- Top assists.
- Coverage/data availability.
- Data status.

Current Team detail includes tabs for:

- Overview.
- Squad.
- Lineups.
- Manager.
- Stadium.
- Fixtures.
- Transfers.

Player Research currently exists as a placeholder with intended data coverage.

## Follow State

Followed teams and leagues are stored in local storage under:

```txt
edgefinder:follows:v1
```

Follow behaviour:

- Assistant fixture list can be filtered to followed leagues/teams.
- Research lists can be filtered to explicitly followed teams/leagues.
- Following a league does not make every team appear as followed in the Teams followed-only filter.

## Media And Logos

Current media sources:

- API-Football team logos.
- API-Football league logos.
- API-Football venue images where venue IDs are present.
- Curated EPL club profile data in `src/data/eplClubProfiles.ts`.

Media helpers:

- `getTeamLogoUrl`.
- `getLeagueLogoUrl`.

## Current Data Types

Core shared types live in `src/types.ts`.

Important domain shapes include:

- `Fixture`
- `TeamSnapshot`
- `PlayerSnapshot`
- `MarketSelection`
- `TeamDossier`
- `LeagueHistoricalDossier`

App-specific navigation/research types live in `src/app/types.ts`.

## Testing Status

There is currently no automated test suite.

Manual checks commonly used:

```bash
npm run build
npm run server:check
```

Recommended first automated coverage:

- URL state parsing/writing.
- Assistant/Research navigation.
- Followed-only filtering.
- Opportunity filtering/sorting.
- Probability/fair-odds utility behaviour.
- Historical archive policy.

## Near-Term Technical Risks

- The response cache is useful, but not enough for odds history or CLV.
- The normalized database now exists, but most UI reads still use the cache/provider-shaped fixture snapshots.
- Provider plan limitations can make current-season API-Football data sparse.
- Current season/team normalisation mixes live data, curated EPL profiles, and estimates; the UI must keep that visible.
- The model can overstate precision unless data-quality chips and audit output stay prominent.
- Without tests, navigation and filter interactions are easy to regress.

## Next Technical Target

Add a normalized local database layer for:

- fixtures.
- teams.
- leagues/seasons.
- venues.
- odds events.
- odds snapshots.
- opportunities.
- opportunity snapshots.

This should be introduced alongside the existing response cache, not as a risky replacement. The existing app should keep working while new sync services begin writing normalized data.
