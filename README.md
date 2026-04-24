# EdgeFinder

Football betting decision-support dashboard.

## Local Setup

Install dependencies:

```bash
npm install
```

Copy `.env.example` to `.env.local` and fill in your own API keys:

```bash
VITE_THE_ODDS_API_KEY=...
VITE_API_FOOTBALL_KEY=...
```

Run the app:

```bash
npm run dev
```

## Data Providers

The app currently renders from `mockProvider`, wrapped in the IndexedDB cache. Live clients are scaffolded for:

- The Odds API: `src/providers/theOddsApiClient.ts`
- API-Football: `src/providers/apiFootballClient.ts`

Keep API keys out of committed source. For a deployed app, move live API calls behind a small backend proxy so keys are not exposed in browser JavaScript.

## Caching Strategy

The browser cache lives in IndexedDB under `edgefinder-cache`. Provider responses are stored with an expiry timestamp and read before the source provider is called.

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
5. The UI highlights positive differences between model probability and market implied probability.
