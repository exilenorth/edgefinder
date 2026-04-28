# EdgeFinder -- Project Status

Last updated: 28 April 2026.

## Summary

EdgeFinder is a football betting decision-support application built with React 18, Vite, TypeScript, Express 5, and SQLite (via sql.js). It provides two connected product areas: a **Betting Assistant** for scanning opportunities and making decisions, and a **Research Hub** for investigating leagues, teams, players, and fixtures.

The app has a working desktop MVP. The product skeleton, navigation, and UX are strong. The current development focus is building the data foundation -- moving from cached API wrappers toward a proper local football and odds data layer.

---

## Current State (as of 28 April 2026)

### Git Status
- **Branch**: `codex/season-data-contract` (recently merged into `main`)
- **Latest merge**: #22 -- "Add explicit season data contract" (2026-04-28)
- **Working tree**: clean
- **Remote**: `https://github.com/exilenorth/edgefinder.git`

### Product Features Delivered

**Betting Assistant**
- Edge Dashboard with opportunity filters (All, Today, 24h, Weekend, Following, Positive edge)
- Selected fixture decision flow: thesis, reasons, risk, counterargument, probabilities
- Candidate / Watch / No clear edge language
- Collapsible evidence panels (Team Form, Goal Projection, Head To Head, Scorelines, Anytime Scorers)
- Fixture sidebar with date, league, followed-only, and grouped fixture filters
- Follow state for leagues and teams persisted in local storage
- Assistant-to-Research cross-links for teams and leagues

**Research Hub**
- Current and Historical modes with season selector
- League, Team, and Player tabs
- Historical league dossiers: standings, top scorers, top assists, coverage indicators
- Team dossier views: overview, squad, lineups, manager, stadium, fixtures, transfers
- Curated EPL club and stadium profiles
- Research-to-Assistant links from fixture rows
- Search and followed-only filters

**Data Providers**
- API-Football v3 and The Odds API v4 clients behind the local backend
- Provider keys protected by the backend proxy; frontend never sees them
- Backend fallback to mock fixtures when live providers are unavailable
- API audit scripts for both providers with generated reports

**Caching**
- Frontend IndexedDB cache with short TTLs for UI fetches
- Backend SQLite response cache (legacy, TTL-based)
- Backend normalized database layer (19 tables, 2 migrations)
- Historical archive path for completed season data

**Navigation and State**
- URL-backed app state (`view`, `fixture`, `entity`, `entityName`, `entityId`)
- In-app back navigation between Assistant and Research
- Browser back/forward support via popstate handling

**Infrastructure**
- `npm run dev`: frontend (Vite, port 5173) + backend (Express, port 8787) concurrently
- TypeScript strict mode across frontend (`tsconfig.json`) and backend (`tsconfig.server.json`)
- Vite dev proxy forwards `/api` requests to the backend

### Important Limitations

- The goal model is a pragmatic Poisson projection model, not true shot-location xG
- Current-season API-Football data may be limited by free-tier plan coverage
- Odds snapshots are stored but not yet surfaced in a time-series UI
- Opportunities are calculated from fixture snapshots but lack a shortlist/saved workflow
- Player Research exists as a structured placeholder, not full entity pages
- No automated test suite exists (TypeScript + tsc checks serve as primary safety net)
- The normalized database is written to during fixture refreshes but UI reads still use the cache/provider path

---

## Where We Are in the Roadmap

The project roadmap has 12 stages. Current position:

| Stage | Name | Status |
|---|---|---|
| **1** | Product Shape and Decision UX | **Mostly complete** |
| **2** | Data Foundation and Provider Sync | **In progress** |
| 3 | Goal Projection Model MVP | Prototype exists |
| 4-12 | Odds Movement, Lineups, Watchlist, CLV, Post-Match, Players, Bet Builder, Mobile, Testing | Not started |

Stage 2 is roughly 50% complete. The normalized schema (19 tables), repositories (8), sync services (2), and historical season import runner are in place. The remaining Stage 2 work is:

- Read-path migration: make UI surfaces read from the normalized layer
- Odds movement UI and edge-decay indicators
- Opportunity history and saved opportunities
- Model audit records
- Tests for migrations, repositories, and snapshot behaviour

The completed Stages 1-2 foundation includes everything listed in the original PRs A-E from the roadmap. PRs D and E are partially implemented.

---

## Current Architecture

### Frontend (port 5173)
```
src/
  app/          -- App shell, sidebar, types
  components/   -- Shared UI primitives (Panel, Metric, LogoMark, etc.)
  features/
    assistant/  -- Edge Dashboard, thesis, reasoning panels (7 files)
    research/   -- Research Hub workspace, sidebar content (2 files)
  model/        -- Poisson goal projection model
  providers/    -- Backend HTTP client, IndexedDB cache, API clients, mock fallback
  utils/        -- Filters, formatting, follows, summaries, team assets
  config/       -- API configuration
  data/         -- Curated EPL club profiles
  cache/        -- Frontend IndexedDB cache
```

### Backend (port 8787)
```
server/
  index.ts              -- Express 5 app, 8 API routes
  config.ts             -- Environment and provider configuration
  cache/
    sqliteCache.ts      -- SQLite TTL cache + historical archive
  db/
    migrations.ts       -- 2 migrations, 19 normalized tables
    types.ts            -- DatabaseConnection interface
  repositories/         -- 8 repository files (leagues, teams, fixtures, odds, opportunities, etc.)
  services/             -- 6 service files (live fixtures, team dossiers, league historical, etc.)
  sync/                 -- 2 sync services (fixture snapshots, odds snapshots)
  audit/                -- API audit framework (5 files)
scripts/
  audit-api-football.ts   -- API-Football audit runner
  audit-odds-api.ts        -- The Odds API audit runner
  sync-historical-season.ts -- Completed season import runner
```

### Database (SQLite via sql.js)
- **19 normalized tables** across 2 migrations
- **Migration 001** (11 tables): provider_requests, leagues, league_seasons, venues, teams, fixtures, fixture_teams, odds_events, odds_snapshots, opportunities, opportunity_snapshots
- **Migration 002** (7 tables): season_data_status, league_standings, league_player_rankings, team_season_statistics, team_season_players, team_transfers, fixture_lineups
- Legacy tables: response_cache (TTL key-value), historical_archive (permanent storage)

### API Endpoints (8 routes)
| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Health + provider key status |
| `GET /api/db/summary` | Normalized table row counts |
| `GET /api/fixtures` | Upcoming fixture list with odds |
| `GET /api/fixtures/:id` | Single fixture detail + H2H |
| `GET /api/fixtures/:id/odds-movement` | Odds movement rows from snapshots |
| `GET /api/teams/:id/dossier` | Team dossier (squad, coach, injuries, etc.) |
| `GET /api/leagues/:id/historical` | Historical league dossier |

---

## Next Steps: Recommended Development Order

### Immediate Priority: Complete Stage 2

1. **Read-path migration** -- Migrate UI fixture reads from the response cache to normalized tables. This is the key structural unlock.
2. **Odds movement UI** -- Surface the stored odds snapshots as edge-decay indicators in the Assistant (first/current/fair price comparison).
3. **Opportunity persistence** -- Add saved opportunities and opportunity history workflows.
4. **Model audit records** -- Formalize model inputs/outputs for reproducibility and auditability.
5. **Testing** -- Add Vitest + React Testing Library for navigation, filters, probability utilities, and cache policies.

### Then: Stage 3 -- Goal Projection Model MVP
- Deterministic model persistence
- Audit input/output snapshots
- Proper labelling (projection model, not xG)
- No future data leakage

### Then: Stage 4 -- Odds Movement and Edge Decay
- First/current/fair price comparison UI
- Edge decay status labels (New edge, Still value, Edge gone, etc.)
- Stale odds warnings

### Longer-term Stages (5-12)
- Lineup-adjusted rechecks (Stage 5)
- Watchlist, shortlist, and bet history (Stage 6)
- Closing line value (Stage 7)
- Post-match process review (Stage 8)
- Player Research and prop angles (Stage 9)
- Bet builder / acca sanity checker (Stage 10)
- Mobile and responsive layout pass (Stage 11)
- Automated testing (Stage 12)

---

## Key Risks

- The response cache and normalized layer coexist but the app still uses the cache for most reads -- this dual-path setup risks inconsistency
- Free-tier API-Football plan limits current-season data access (works for historical seasons)
- No shot-location xG data from current providers -- the model projection should stay honestly labelled
- Without tests, navigation and filter interactions are vulnerable to regression
- sql.js writes the entire database file on every write, which is acceptable for the current scale but won't scale indefinitely

---

## Product North Star

> EdgeFinder should explain the opportunity, the risk, the counterargument, and whether the price still works.

The app should help users think better. It should not behave like a tipster feed.
