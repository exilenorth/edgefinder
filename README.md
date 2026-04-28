# EdgeFinder

EdgeFinder is a football betting decision-support app. It is designed to help a user find fixtures worth investigating, understand the modelled edge, inspect the risks, and drill into the supporting league/team evidence before making their own decision.

The product is deliberately split into two connected areas:

- **Betting Assistant**: scan opportunities, select a fixture, read the decision thesis, risks, probabilities, and supporting evidence.
- **Research Hub**: browse leagues and teams, inspect current and historical context, follow entities, and jump back into relevant Assistant fixture analysis.

EdgeFinder is not a tips app and should not present model output as certainty. The UI should keep uncertainty, stale data, cached data, missing lineups, and prototype model status visible.

## Current State

As of 28 April 2026, the app has a working React/Vite frontend and Express backend proxy.

Implemented product features:

- Assistant and Research top-level navigation.
- URL-backed app state for `view`, selected `fixture`, and selected research entity.
- In-app back navigation between Assistant and Research.
- Fixture sidebar with date, league, followed-only, and grouped fixture filters.
- Follow state for leagues and teams persisted in local storage.
- Edge Dashboard at the top of the Assistant.
- Opportunity filters: All, Today, 24h, Weekend, Following, Positive edge.
- Selected fixture decision flow with thesis, reasons, risk, counterargument, probabilities, and collapsible evidence.
- Candidate / Watch / No clear edge language instead of direct betting-advice wording.
- Assistant-to-Research links for teams and leagues.
- Research-to-Assistant links from fixture rows.
- Research Hub with Current and Historical modes.
- League, Team, and Player tabs, with Player Research currently a structured placeholder.
- Current EPL team normalisation and curated club/stadium profile support.
- Historical league dossiers with standings, top scorers, top assists, and coverage indicators.
- Team dossier views for overview, squad, lineups, manager, stadium, fixtures, and transfers where provider data is available.
- API-Football and The Odds API clients behind the local backend.
- Frontend IndexedDB cache and backend SQLite-compatible cache/archive.
- API audit scripts and provider documentation.

Important limitations:

- The current goal model is a pragmatic projection model, not true shot-location xG.
- Current-season API-Football data may be limited by plan coverage.
- Odds snapshots are not yet stored as a historical time series.
- Opportunities are calculated on the fly from fixture snapshots, not persisted.
- Player Research is not yet a full entity detail workflow.
- There is no automated test suite yet.

## Local Setup

Install dependencies:

```bash
npm install
```

Copy `.env.example` to `.env.local` and fill in your own keys:

```bash
VITE_THE_ODDS_API_KEY=...
VITE_API_FOOTBALL_KEY=...
THE_ODDS_API_KEY=...
API_FOOTBALL_KEY=...
```

Run the app:

```bash
npm run dev
```

This starts:

- Frontend: `http://127.0.0.1:5173`
- Backend API proxy: `http://127.0.0.1:8787`

Build and type-check:

```bash
npm run build
npm run server:check
```

## Scripts

- `npm run dev`: starts backend and frontend together.
- `npm run dev:web`: starts Vite only.
- `npm run dev:server`: starts the Express backend in watch mode.
- `npm run build`: TypeScript check plus Vite production build.
- `npm run preview`: preview production build.
- `npm run server`: starts the backend once.
- `npm run server:check`: type-checks the backend.
- `npm run audit:api-football`: runs API-Football audit tooling.
- `npm run audit:odds`: runs The Odds API audit tooling.

## Documentation

- [Implementation Roadmap](docs/implementation-roadmap.md)
- [Technical Specification](docs/technical-specification.md)
- [Product Structure](docs/product-structure.md)
- [Data Storage Strategy](docs/data-storage-strategy.md)
- [API-Football Endpoint Map](docs/api-football-endpoints.md)
- [Provider Audit Findings](docs/provider-audit-findings.md)

## Data Providers

The frontend calls `backendProvider`, which talks to local `/api` endpoints. The backend owns provider keys, provider calls, caching, and fallback behaviour.

Current provider responsibilities:

- API-Football: fixtures, teams, head-to-heads, standings, top scorers, top assists, squads, coaches, injuries, transfers, lineups, coverage.
- The Odds API: fixture odds and market pricing for supported football sports.

If live providers fail or are unavailable, the app falls back to mock fixture data so the UI remains usable.

## Caching

EdgeFinder currently has two cache layers:

- Frontend IndexedDB cache: short-lived UI cache for fixture requests.
- Backend SQLite-compatible cache/archive: provider response cache plus static historical archive support.

Historical completed-season data should be fetched once, archived locally, and then reused indefinitely unless a manual refresh/audit is requested.

## Product Direction

The next major product step is to move from a cached API wrapper plus prototype model toward a proper modelling/data platform:

1. Add persistent domain tables and repositories.
2. Store odds events and odds snapshots.
3. Persist opportunities and opportunity snapshots.
4. Build a reproducible goal projection model with audit output.
5. Use stored odds movement to show edge decay and closing line value.
6. Add lineup-adjusted rechecks.
7. Build real Player Research and player-market context.

The north star remains simple:

> EdgeFinder should explain the opportunity, the risk, the counterargument, and whether the price still works.
