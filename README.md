# EdgeFinder

EdgeFinder is a football betting decision-support app. It is designed to help a user find fixtures worth investigating, understand the modelled edge, inspect the risks, and drill into the supporting league/team evidence before making their own decision.

The product is deliberately split into two connected areas:

- **Betting Assistant**: scan opportunities, select a fixture, read the decision thesis, risks, probabilities, and supporting evidence.
- **Research Hub**: browse leagues and teams, inspect current and historical context, follow entities, and jump back into relevant Assistant fixture analysis.

EdgeFinder is not a tips app and should not present model output as certainty. The UI should keep uncertainty, stale data, cached data, missing lineups, and prototype model status visible.

## Current State

As of 28 April 2026, the app has a working desktop MVP with a React/Vite frontend and Express backend proxy.

**Implemented product features:**

- Assistant and Research top-level navigation with URL-backed state
- In-app back navigation and browser back/forward support
- Edge Dashboard with opportunity filters (All, Today, 24h, Weekend, Following, Positive edge)
- Selected fixture decision flow: thesis, reasons, risk, counterargument, probabilities, collapsible evidence
- Candidate / Watch / No clear edge language
- Assistant-to-Research and Research-to-Assistant cross-links
- Research Hub with Current and Historical modes, season selector
- Historical league dossiers: standings, top scorers, top assists, coverage indicators
- Team dossier views: overview, squad, lineups, manager, stadium, fixtures, transfers
- Curated EPL club and stadium profiles
- Follow state for leagues and teams persisted in local storage
- API-Football v3 and The Odds API v4 clients behind the local backend
- Frontend IndexedDB cache + backend SQLite response cache
- Normalized local database layer (19 tables across 2 migrations)
- Repository layer (8 repositories) and sync services (fixture + odds snapshots)
- Historical season import runner (`npm run sync:historical-season`)
- `/api/fixtures/:id/odds-movement` endpoint for future edge-decay UI
- `/api/db/summary` developer endpoint for normalized table row counts
- API audit scripts and provider documentation
- Player Research structured placeholder

**Important limitations:**

- The goal model is a pragmatic Poisson projection model, not true shot-location xG
- Current-season API-Football data may be limited by free-tier plan coverage
- Odds snapshots are stored but not yet surfaced in a time-series or edge-decay UI
- UI reads still use the cache/provider path; the normalized layer is written to but not the read source
- Player Research is not yet a full entity detail workflow
- No automated test suite yet (TypeScript strict mode + tsc serves as primary safety net)

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

- [Project Status](docs/project-status.md) -- current state, architecture, and next steps
- [Implementation Roadmap](docs/implementation-roadmap.md) -- 12-stage feature roadmap
- [Technical Specification](docs/technical-specification.md) -- runtime stack, API, data flow, types
- [Product Structure](docs/product-structure.md) -- two-product-area design
- [Data Storage Strategy](docs/data-storage-strategy.md) -- local DB design and sync strategy
- [API-Football Endpoint Map](docs/api-football-endpoints.md) -- full endpoint inventory
- [Provider Audit Findings](docs/provider-audit-findings.md) -- audit results and implications

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
