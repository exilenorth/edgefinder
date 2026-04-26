# EdgeFinder Data Storage Strategy

This document outlines how EdgeFinder can reduce API usage by storing provider data locally in its own database.

The core idea is simple:

> Fetch expensive or slow-changing provider data once, store it in EdgeFinder's database, and refresh it only when it is likely to have changed.

This is especially useful because EdgeFinder uses two external providers:

- **API-Football** for football data, research context, fixtures, teams, players, standings, injuries, lineups, and historical data.
- **The Odds API** for live market prices, bookmaker prices, and market availability.

The storage strategy should treat these providers differently.

---

# Why Store Provider Data?

Storing provider data locally helps with:

- Lower API usage
- Faster UI responses
- Better reliability if a provider is temporarily unavailable
- Easier historical analysis
- More control over data freshness
- Ability to build your own derived tables and model inputs
- Better auditability of what data the app used at a point in time

For a betting analysis app, this is not just a performance optimisation. It is also a trust feature.

If the app can say:

```txt
Odds refreshed 4 minutes ago
Team profile refreshed 18 days ago
Historical season archived permanently
Lineups not yet available
```

then the user has a much clearer sense of what is live, stale, estimated, or fixed.

---

# Data Categories

Provider data should be split into update-frequency buckets.

## 1. Static or Near-Static Data

This data rarely changes and is ideal for long-term local storage.

Examples:

- Countries
- League IDs
- League names
- League logos
- Team IDs
- Team names
- Team logos
- Venue IDs
- Venue names
- Venue capacity
- Venue city
- Stadium images
- Historical seasons
- Completed league tables
- Completed fixture results
- Historical top scorers
- Historical top assists
- Historical transfers

Recommended refresh cadence:

```txt
Monthly / manually / on demand
```

For completed historical seasons, data can usually be treated as permanent after it has been fully archived.

---

## 2. Slowly Changing Data

This data changes occasionally and should be refreshed periodically.

Examples:

- Current squad lists
- Player profiles
- Manager/coach data
- Team venue data
- Season player stats for an active season
- Team season statistics
- Transfers during a window
- Injury records outside matchday windows

Recommended refresh cadence:

```txt
Daily / weekly depending on feature importance
```

---

## 3. Frequently Changing Data

This data changes often and needs shorter TTLs.

Examples:

- Upcoming fixtures
- Fixture statuses
- Injuries close to matchday
- Lineups near kickoff
- Current standings during active season
- Current top scorers/top assists

Recommended refresh cadence:

```txt
Minutes to hours depending on data type
```

---

## 4. Volatile Betting Market Data

This data changes constantly and should be stored as snapshots rather than treated as permanent truth.

Examples:

- Odds prices
- Bookmaker market availability
- Market last update timestamps
- Odds movement over time
- Best price by bookmaker

Recommended refresh cadence:

```txt
2-15 minutes depending on kickoff proximity and API quota
```

Near kickoff, refresh more often. Far from kickoff, refresh less often.

---

# Recommended Storage Model

EdgeFinder should move from a simple response cache toward a proper local data store with typed tables.

The existing SQLite-compatible cache is useful, but long-term the app will benefit from separating:

1. Raw provider responses
2. Normalised domain tables
3. Derived/model-ready data
4. Odds snapshots
5. Refresh metadata

---

# Suggested Tables

## Provider Metadata

### `provider_requests`

Stores raw request/response metadata for auditing and debugging.

```sql
CREATE TABLE provider_requests (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_params_json TEXT NOT NULL,
  response_json TEXT,
  status TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  expires_at INTEGER,
  error_message TEXT
);
```

Use this for:

- debugging provider issues
- auditing where values came from
- fallback responses
- quota investigation

---

## Static Reference Tables

### `leagues`

```sql
CREATE TABLE leagues (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  country_name TEXT,
  country_code TEXT,
  logo_url TEXT,
  last_refreshed_at INTEGER NOT NULL
);
```

### `league_seasons`

```sql
CREATE TABLE league_seasons (
  league_id INTEGER NOT NULL,
  season INTEGER NOT NULL,
  is_current INTEGER NOT NULL,
  coverage_json TEXT,
  last_refreshed_at INTEGER NOT NULL,
  PRIMARY KEY (league_id, season)
);
```

### `teams`

```sql
CREATE TABLE teams (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  country TEXT,
  founded INTEGER,
  national INTEGER,
  logo_url TEXT,
  venue_id INTEGER,
  last_refreshed_at INTEGER NOT NULL
);
```

### `venues`

```sql
CREATE TABLE venues (
  id INTEGER PRIMARY KEY,
  name TEXT,
  address TEXT,
  city TEXT,
  capacity INTEGER,
  surface TEXT,
  image_url TEXT,
  last_refreshed_at INTEGER NOT NULL
);
```

---

## Fixture Tables

### `fixtures`

```sql
CREATE TABLE fixtures (
  id INTEGER PRIMARY KEY,
  league_id INTEGER NOT NULL,
  season INTEGER NOT NULL,
  date TEXT NOT NULL,
  status_short TEXT,
  venue_id INTEGER,
  home_team_id INTEGER NOT NULL,
  away_team_id INTEGER NOT NULL,
  home_goals INTEGER,
  away_goals INTEGER,
  last_refreshed_at INTEGER NOT NULL
);
```

### `fixture_statistics`

```sql
CREATE TABLE fixture_statistics (
  fixture_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  statistics_json TEXT NOT NULL,
  last_refreshed_at INTEGER NOT NULL,
  PRIMARY KEY (fixture_id, team_id)
);
```

### `fixture_lineups`

```sql
CREATE TABLE fixture_lineups (
  fixture_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  formation TEXT,
  start_xi_json TEXT NOT NULL,
  last_refreshed_at INTEGER NOT NULL,
  PRIMARY KEY (fixture_id, team_id)
);
```

---

## Team and Player Tables

### `team_statistics`

```sql
CREATE TABLE team_statistics (
  team_id INTEGER NOT NULL,
  league_id INTEGER NOT NULL,
  season INTEGER NOT NULL,
  statistics_json TEXT NOT NULL,
  last_refreshed_at INTEGER NOT NULL,
  PRIMARY KEY (team_id, league_id, season)
);
```

### `players`

```sql
CREATE TABLE players (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  firstname TEXT,
  lastname TEXT,
  age INTEGER,
  nationality TEXT,
  height TEXT,
  weight TEXT,
  injured INTEGER,
  photo_url TEXT,
  last_refreshed_at INTEGER NOT NULL
);
```

### `player_season_statistics`

```sql
CREATE TABLE player_season_statistics (
  player_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  league_id INTEGER NOT NULL,
  season INTEGER NOT NULL,
  position TEXT,
  appearances INTEGER,
  lineups INTEGER,
  minutes INTEGER,
  goals INTEGER,
  assists INTEGER,
  raw_statistics_json TEXT NOT NULL,
  last_refreshed_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, team_id, league_id, season)
);
```

### `injuries`

```sql
CREATE TABLE injuries (
  id TEXT PRIMARY KEY,
  player_id INTEGER,
  player_name TEXT NOT NULL,
  team_id INTEGER NOT NULL,
  league_id INTEGER,
  season INTEGER,
  fixture_id INTEGER,
  injury_type TEXT,
  reason TEXT,
  fixture_date TEXT,
  last_refreshed_at INTEGER NOT NULL
);
```

### `transfers`

```sql
CREATE TABLE transfers (
  id TEXT PRIMARY KEY,
  player_id INTEGER,
  player_name TEXT NOT NULL,
  transfer_date TEXT,
  transfer_type TEXT,
  team_in_id INTEGER,
  team_in_name TEXT,
  team_out_id INTEGER,
  team_out_name TEXT,
  last_refreshed_at INTEGER NOT NULL
);
```

---

## League Tables and Historical Data

### `standings`

```sql
CREATE TABLE standings (
  league_id INTEGER NOT NULL,
  season INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  rank INTEGER,
  points INTEGER,
  played INTEGER,
  wins INTEGER,
  draws INTEGER,
  losses INTEGER,
  goals_for INTEGER,
  goals_against INTEGER,
  goal_difference INTEGER,
  form TEXT,
  last_refreshed_at INTEGER NOT NULL,
  PRIMARY KEY (league_id, season, team_id)
);
```

### `league_top_scorers`

```sql
CREATE TABLE league_top_scorers (
  league_id INTEGER NOT NULL,
  season INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  team_id INTEGER,
  rank INTEGER,
  goals INTEGER,
  assists INTEGER,
  appearances INTEGER,
  minutes INTEGER,
  last_refreshed_at INTEGER NOT NULL,
  PRIMARY KEY (league_id, season, player_id)
);
```

### `league_top_assists`

```sql
CREATE TABLE league_top_assists (
  league_id INTEGER NOT NULL,
  season INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  team_id INTEGER,
  rank INTEGER,
  assists INTEGER,
  goals INTEGER,
  appearances INTEGER,
  minutes INTEGER,
  last_refreshed_at INTEGER NOT NULL,
  PRIMARY KEY (league_id, season, player_id)
);
```

---

## Odds Tables

### `odds_events`

Maps provider event IDs to internal/API-Football fixtures where possible.

```sql
CREATE TABLE odds_events (
  odds_event_id TEXT PRIMARY KEY,
  sport_key TEXT NOT NULL,
  sport_title TEXT,
  commence_time TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  api_football_fixture_id INTEGER,
  match_confidence TEXT,
  last_refreshed_at INTEGER NOT NULL
);
```

### `odds_snapshots`

Stores each odds fetch as a snapshot for movement tracking.

```sql
CREATE TABLE odds_snapshots (
  id TEXT PRIMARY KEY,
  odds_event_id TEXT NOT NULL,
  bookmaker_key TEXT NOT NULL,
  bookmaker_title TEXT NOT NULL,
  market_key TEXT NOT NULL,
  outcome_name TEXT NOT NULL,
  outcome_price REAL NOT NULL,
  outcome_point REAL,
  market_last_update TEXT,
  bookmaker_last_update TEXT,
  fetched_at INTEGER NOT NULL
);
```

This allows:

- best-price comparison
- odds movement charts
- stale market warnings
- historical market analysis

---

# Recommended Refresh Cadences

## API-Football

| Data type | Refresh cadence | Notes |
|---|---:|---|
| League metadata | Monthly/manual | Very stable |
| League season coverage | Monthly/manual | Stable once season exists |
| Team profile | Monthly | Names/logos/venues rarely change |
| Venue profile | Monthly/manual | Very stable |
| Completed fixtures | Archive permanently | Results should not change after settled, except corrections |
| Upcoming fixtures | 30-60 minutes | More often on matchdays |
| Fixture status | 5-15 minutes near kickoff/live | Useful for postponements/live status |
| Standings current season | 1-6 hours | More often after matches |
| Completed season standings | Archive permanently | Static after season completion |
| Team season statistics | 12-24 hours | Active season changes after matches |
| Player season statistics | 12-24 hours | Active season changes after matches |
| Injuries | 2-12 hours | More often near matchday |
| Lineups | 2-10 minutes near kickoff | Usually unavailable until close to kickoff |
| Transfers | Daily during windows, weekly otherwise | Can be archived by season |
| Top scorers/assists current | 12-24 hours | Changes after matches |
| Top scorers/assists completed | Archive permanently | Static after completion |

## The Odds API

| Data type | Refresh cadence | Notes |
|---|---:|---|
| Sports list | Daily/weekly | Mostly stable |
| Event list | 15-60 minutes | Depends on fixture horizon |
| Odds far from kickoff | 15-60 minutes | Quota-friendly |
| Odds same day | 5-15 minutes | More useful for Assistant |
| Odds near kickoff | 2-5 minutes if quota allows | Most volatile |
| Event-specific odds | On fixture open / manual refresh | Good for detail pages |
| Odds snapshots | Store every fetch | Needed for movement tracking |

---

# Suggested Architecture

## 1. Provider Client Layer

Responsible only for calling provider APIs.

Existing examples:

- `ApiFootballClient`
- `TheOddsApiClient`

Keep this layer thin.

---

## 2. Repository / Storage Layer

Responsible for reading/writing the local database.

Suggested files:

```txt
server/repositories/
  leagueRepository.ts
  teamRepository.ts
  fixtureRepository.ts
  playerRepository.ts
  oddsRepository.ts
  providerRequestRepository.ts
```

---

## 3. Sync Services

Responsible for deciding whether to use local data or refresh from provider.

Suggested files:

```txt
server/sync/
  syncLeagues.ts
  syncTeams.ts
  syncFixtures.ts
  syncTeamDossier.ts
  syncLeagueSeason.ts
  syncOdds.ts
```

Each sync service should answer:

```txt
Do we already have this data?
Is it fresh enough?
Should we fetch from provider?
Should we archive it permanently?
```

---

## 4. App Services

Responsible for serving app-ready DTOs to the frontend.

Examples:

```txt
server/services/
  liveFixtureService.ts
  teamDossierService.ts
  leagueHistoricalService.ts
  bettingAssistantService.ts
  researchHubService.ts
```

These should increasingly read from local storage first and only call sync services when data is missing or stale.

---

# Sync Strategy

## Read-through cache pattern

When the frontend requests data:

```txt
1. Check local database.
2. If fresh enough, return local data.
3. If missing/stale, fetch provider data.
4. Store provider data locally.
5. Return normalised app response.
```

This is simple and works well early on.

## Scheduled sync pattern

Later, add scheduled jobs:

```txt
- Refresh upcoming fixtures every 30 minutes.
- Refresh same-day odds every 5-15 minutes.
- Refresh team/player stats nightly.
- Archive completed fixtures after final whistle.
- Archive completed seasons after season end.
```

This reduces user-facing wait times.

## Manual sync/admin pattern

Eventually, add admin/dev commands:

```bash
npm run sync:leagues
npm run sync:fixtures
npm run sync:teams
npm run sync:season -- --league=39 --season=2025
npm run sync:odds
```

Useful while building and debugging.

---

# What Should Be Stored First?

Start with the highest value, lowest volatility data.

## Priority 1 — Reference Data

Store:

- leagues
- league seasons
- teams
- venues

Why:

- Low volatility
- Easy to cache long-term
- Needed everywhere
- Reduces repeated provider calls

## Priority 2 — Fixture Data

Store:

- upcoming fixtures
- completed fixtures
- fixture status
- fixture IDs and team IDs

Why:

- Central to both Assistant and Research Hub
- Needed for matching with odds
- Completed fixtures become useful historical data

## Priority 3 — Team and League Research Data

Store:

- standings
- team statistics
- player season statistics
- squads
- top scorers
- top assists

Why:

- Powers Research Hub
- Refresh cadence can be slow
- Very reusable across screens

## Priority 4 — Injuries and Lineups

Store:

- current injuries
- fixture lineups

Why:

- Important for Assistant confidence/risk flags
- More volatile, so implement after stable entities are in place

## Priority 5 — Odds Snapshots

Store:

- odds events
- bookmaker prices
- market outcomes
- fetch timestamps

Why:

- Powers odds movement and best-price comparison
- Highly valuable but needs careful TTL/quota handling

---

# Static Data Worth Preloading

The app could include a setup/sync command that preloads stable football reference data.

For Premier League-focused MVP:

```txt
- Premier League league record
- Current Premier League season coverage
- Current Premier League teams
- Team profiles
- Venue profiles
- Previous season standings
- Previous season top scorers
- Previous season top assists
```

This would massively improve app startup and reduce API calls.

---

# Local Database Choice

The app currently uses `sql.js`, which is fine for local development and small cache files.

However, as the app grows, consider moving to one of these:

## Option A — SQLite with better Node bindings

Examples:

- `better-sqlite3`
- `sqlite3`

Best for:

- local app
- single-user deployment
- simple server deployment
- easy backups

## Option B — Postgres

Best for:

- deployed multi-user app
- larger data volume
- concurrent users
- cloud hosting
- future accounts/watchlists

## Recommendation

For now:

```txt
Use SQLite locally, but design the schema as if it could later move to Postgres.
```

Avoid SQL.js long-term if you expect the backend to grow. It exports the whole DB file on writes, which is okay for a small cache but not ideal for a larger data store.

---

# Legal / Terms Warning

Before storing provider data permanently, check each provider's terms.

Some APIs allow caching for performance but restrict:

- long-term storage
- redistribution
- public display
- resale
- historical archiving
- derived datasets

This matters especially for sports and odds data.

Recommended approach:

- Store data only for your app's internal use.
- Keep provider attribution if required.
- Respect cache limits in provider terms.
- Do not expose raw provider datasets for download.
- Verify whether odds snapshots can be stored historically.

This is not legal advice, but ignoring API terms is a great way to get your keys nuked. Deeply unsexy, but important.

---

# Suggested Implementation Plan

## PR 1 — Add storage strategy docs

Add this document.

## PR 2 — Introduce database schema/migrations

Add:

```txt
server/db/schema.sql
server/db/migrate.ts
```

Start with:

- leagues
- league_seasons
- teams
- venues
- fixtures
- provider_requests

## PR 3 — Add repositories

Add repository classes for:

- leagues
- teams
- fixtures
- provider requests

## PR 4 — Add league/team sync

Add sync services for:

- league metadata
- team profiles
- venues

## PR 5 — Add fixture sync

Store upcoming and completed fixtures locally.

## PR 6 — Update app services to read from DB first

Update:

- `LiveFixtureService`
- `TeamDossierService`
- `LeagueHistoricalService`

So they read from local DB first, then provider if stale/missing.

## PR 7 — Add odds snapshot storage

Add:

- `odds_events`
- `odds_snapshots`
- odds sync service
- bookmaker comparison support

## PR 8 — Add freshness/status UI

Expose data freshness in API responses and frontend UI.

---

# Final Recommendation

Yes, EdgeFinder should absolutely store provider data locally.

The best approach is:

```txt
Static football reference data -> store long term
Completed historical data -> archive permanently if provider terms allow
Current season stats -> refresh periodically
Injuries/lineups -> short TTL
Odds -> short TTL plus snapshots for movement tracking
```

This will reduce API calls, make the app faster, and give you the foundation for a proper Research Hub.

The only caution: do not treat all data the same. A stadium name and a bookmaker price are completely different beasts. One can sit happily in the database for weeks. The other goes stale faster than a supermarket sandwich.
