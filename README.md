# EdgeFinder

Football betting decision-support dashboard built around two clear product areas: **Betting Assistant** and **Research Hub**.

## Product Structure

EdgeFinder is intended to feel like two connected tools under one roof:

1. **Betting Assistant** — a fast, opinionated decision area for finding fixtures and markets worth investigating.
2. **Research Hub** — a deep evidence area for exploring leagues, teams, players, fixtures, and historical seasons.

The goal is to separate decisions from evidence:

- Betting Assistant answers: “What should I look at, why, and how much should I trust it?”
- Research Hub answers: “Show me the underlying data so I can investigate properly.”

See [`docs/product-structure.md`](docs/product-structure.md) for the detailed information architecture.

## Local Setup

Install dependencies:

```bash
npm install
```

Copy `.env.example` to `.env.local` and fill in your own API keys:

```bash
VITE_THE_ODDS_API_KEY=...
VITE_API_FOOTBALL_KEY=...
THE_ODDS_API_KEY=...
API_FOOTBALL_KEY=...
```

For API-Football league seasons, use the season start year. For example, the 2025/26 Premier League season is `2025`.

Run the app:

```bash
npm run dev
```

This starts both services:

- Frontend: `http://127.0.0.1:5173`
- Backend API proxy: `http://127.0.0.1:8787`

## Data Providers

The app renders through `backendProvider`, which calls local `/api` endpoints. The backend owns the live provider calls and falls back to mock fixtures if live data is unavailable.

- The Odds API: `src/providers/theOddsApiClient.ts`
- API-Football: `src/providers/apiFootballClient.ts`

Keep API keys out of committed source. For a deployed app, live provider calls should remain behind the backend proxy so keys are not exposed in browser JavaScript.

## Caching Strategy

The frontend keeps a short IndexedDB cache under `edgefinder-cache` to avoid repeated UI fetches. The backend also stores provider responses in a local SQLite-compatible cache file under `data/edgefinder-cache.sqlite`, which keeps API keys and rate-limit protection on the server side.

Suggested TTLs when live data is wired:

- Fixture list: 10-30 minutes
- Pre-match odds: 2-5 minutes near kick-off, 15 minutes otherwise
- Team/player historical stats: 12-24 hours
- Completed fixture stats: cache indefinitely once final

## Intended Live Flow

1. API-Football fetches fixtures, team IDs, head-to-heads, form, team stats, and player stats.
2. The Odds API fetches market prices for the matching sport key, regions/bookmakers, and markets.
3. A mapper reconciles events by home team, away team, and kick-off time.
4. The model computes fair prices from expected goals and scorer threat.
5. The Betting Assistant highlights potential opportunities with confidence, freshness, and risk context.
6. The Research Hub lets users inspect the supporting league, team, player, and fixture data.
