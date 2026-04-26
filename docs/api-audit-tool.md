# EdgeFinder API Audit Tool

The API audit tool is a local developer utility for checking exactly what API-Football and The Odds API return for the keys, leagues, seasons, sports, regions, markets, and bookmaker filters used by EdgeFinder.

It is intentionally separate from the main app UI. The first job is to gather evidence safely and repeatably before building user-facing features on top of assumptions.

---

## What it does

The audit scripts:

- call selected provider endpoints with controlled limits;
- write raw provider responses to a local SQLite-compatible database;
- extract discovered JSON field paths from every response;
- write endpoint availability summaries;
- generate readable Markdown reports under `reports/api-audit`;
- avoid storing API keys in request metadata.

Default database:

```txt
data/api-audit.sqlite
```

Default report directory:

```txt
reports/api-audit
```

Both are intended for local inspection and should not be committed with real audit output.

---

## Setup

Install dependencies after pulling this branch:

```bash
npm install
```

Add keys to `.env.local` or `.env`:

```bash
API_FOOTBALL_KEY=...
THE_ODDS_API_KEY=...
```

The scripts also support the existing Vite-prefixed key names:

```bash
VITE_API_FOOTBALL_KEY=...
VITE_THE_ODDS_API_KEY=...
```

---

## Run API-Football audit

Basic Premier League audit:

```bash
npm run audit:api-football -- --league=39 --season=2025
```

Useful options:

```bash
npm run audit:api-football -- \
  --league=39 \
  --season=2025 \
  --sample-fixtures=10 \
  --max-teams=4 \
  --max-player-pages=1 \
  --min-interval-ms=6500
```

Options:

| Option | Default | Purpose |
|---|---:|---|
| `--league` | `39` | API-Football league ID |
| `--season` | `2025` | Season start year |
| `--sample-fixtures` | `10` | Number of fixtures used to find sample fixture/team IDs |
| `--max-teams` | `4` | Max teams to test team/player endpoints against |
| `--max-player-pages` | `1` | Max `/players` pages per sampled team |
| `--min-interval-ms` | `6500` | Delay between API-Football calls |
| `--db` | `data/api-audit.sqlite` | Output audit DB path |
| `--report-dir` | `reports/api-audit` | Markdown report directory |

### API-Football endpoints tested

The audit currently checks:

- `/leagues`
- `/fixtures`
- `/fixtures/statistics`
- `/fixtures/players`
- `/fixtures/events`
- `/fixtures/lineups`
- `/fixtures/headtohead`
- `/teams`
- `/teams/statistics`
- `/players/squads`
- `/players`
- `/injuries`
- `/transfers`
- `/standings`
- `/players/topscorers`
- `/players/topassists`
- `/predictions`

The script uses a small fixture/team sample so you do not accidentally burn through quota.

---

## Run The Odds API audit

Basic EPL odds audit:

```bash
npm run audit:odds -- --sport=soccer_epl --regions=uk,eu --markets=h2h,totals
```

Useful options:

```bash
npm run audit:odds -- \
  --sport=soccer_epl \
  --regions=uk,eu \
  --markets=h2h,totals,spreads \
  --sample-events=3
```

Options:

| Option | Default | Purpose |
|---|---:|---|
| `--sport` | `soccer_epl` | The Odds API sport key |
| `--regions` | `uk,eu` | Odds regions |
| `--markets` | `h2h,totals` | Markets to request |
| `--bookmakers` | empty | Optional bookmaker filter |
| `--sample-events` | `3` | Number of event-specific odds calls |
| `--db` | `data/api-audit.sqlite` | Output audit DB path |
| `--report-dir` | `reports/api-audit` | Markdown report directory |

### The Odds API endpoints tested

The audit currently checks:

- `/v4/sports`
- `/v4/sports/{sport}/events`
- `/v4/sports/{sport}/odds`
- `/v4/sports/{sport}/events/{eventId}/odds`

---

## How to review results

Each run writes:

1. raw responses into `api_audit_requests`;
2. extracted JSON paths into `api_audit_field_paths`;
3. endpoint availability into `api_audit_endpoint_summary`;
4. a readable Markdown report into `reports/api-audit`.

The Markdown report is the easiest first place to inspect.

Look for field paths such as:

```txt
response[].statistics[].type
response[].statistics[].value
response[].players[].statistics[].shots.total
response[].players[].statistics[].shots.on
response[].players[].statistics[].games.minutes
response[].players[].statistics[].cards.yellow
```

This tells us what is genuinely available for the selected league/season/key combination.

---

## What this should help decide

The audit output should help answer:

- Does API-Football return fixture statistics for this league/season?
- Does it return player match statistics?
- Do player stats include shots, shots on target, cards, fouls, tackles, passes, etc.?
- Are lineups available for sampled fixtures?
- Are injuries available?
- Do any endpoints include xG or shot-location style data?
- Which Odds API markets are available for the selected sport/regions?
- Do odds responses include useful `last_update` fields?
- Can event-specific odds be refreshed reliably?

---

## Important cautions

- Do not run audits with huge sample sizes until you understand your provider quota.
- Do not commit generated reports or SQLite files containing real provider responses.
- Do not treat one league's coverage as universal. Repeat audits for other leagues you care about.
- Do not assume true shot-based xG is available unless the audit finds shot-location or per-shot xG fields.

---

## Recommended next step after first run

Run:

```bash
npm run audit:api-football -- --league=39 --season=2025 --sample-fixtures=10 --max-teams=4 --max-player-pages=1
npm run audit:odds -- --sport=soccer_epl --regions=uk,eu --markets=h2h,totals,spreads --sample-events=3
```

Then review the generated Markdown reports and use the discovered field paths to update:

- data models;
- Research Hub sections;
- Goal Projection Model inputs;
- odds snapshot schema;
- feature readiness decisions.
