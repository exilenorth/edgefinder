# Provider Audit Findings

Generated from local audit runs on 2026-04-26.

Raw generated reports are kept locally under `reports/api-audit/` and are intentionally ignored by git. This note captures the decisions we should carry forward into the application design.

## Runs

| Provider | Scope | Run ID | Result |
|---|---|---|---|
| API-Football | Premier League 2024 | `run_1777191757337_58k7w9kx` | Completed |
| API-Football | Premier League 2023 | `run_1777191944896_syphumr8` | Completed |
| The Odds API | `soccer_epl`, `uk,eu`, `h2h,totals,spreads` | `run_1777191927602_1g86ildy` | Completed |

## API-Football Historical Seasons

The free/API tier used in the audit returned useful historical Premier League data for both 2024 and 2023 seasons.

Available in both audited seasons:

- `/leagues`
- `/fixtures`
- `/fixtures/statistics`
- `/fixtures/players`
- `/fixtures/events`
- `/fixtures/lineups`
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

Key observed fields:

- Fixture identity, dates, venue, referee, status, teams, goals, league metadata.
- Match events including elapsed minute, team, player, assist, card/goal/substitution detail.
- Confirmed lineups including formation, coach, start XI, substitutes, player grid and position.
- Fixture player statistics including minutes, cards, shots, passes, duels, dribbles, fouls and ratings-style data.
- Team statistics and standings for completed seasons.
- Squad lists, injuries and transfers for sampled teams.

## API-Football Limitations

`/fixtures/headtohead` returned HTTP 200 but no usable results in both audited seasons because the response included:

```txt
Free plans do not have access to the Last parameter.
```

Do not rely on `/fixtures/headtohead?last=...` for the free tier. We can still build head-to-head context ourselves by querying stored fixtures for the two teams once historical fixture data is persisted locally.

No obvious true xG or shot-location field was found in the sampled field paths. Treat any current expected-goals output as our own goal projection model unless a richer provider is added.

## The Odds API

The audited EPL odds scope returned usable current market data.

Available endpoints:

- `/v4/sports`
- `/v4/sports/soccer_epl/events`
- `/v4/sports/soccer_epl/odds`
- `/v4/sports/soccer_epl/events/{eventId}/odds`

Useful observed fields:

- Event IDs, home/away team names, commence time and sport key.
- Bookmaker key/title.
- Market key, market `last_update`, outcomes, prices and points.
- H2H, totals and spreads were returned in the audited request.

This is enough to support odds snapshot storage, bookmaker comparison, event-specific refreshes, odds movement, and closing-line-value tracking.

## Product Implications

1. Build a historical import/cache flow for completed seasons first.
2. Store historical fixture, lineup, event, player-stat, team-stat, squad, injury, transfer and standings data locally.
3. Build head-to-heads from our own stored fixture table instead of the restricted head-to-head endpoint.
4. Add odds snapshot tables before building odds movement or CLV features.
5. Label the model honestly as a goal projection model, not true shot-based xG, until we have a provider with shot locations or xG fields.

## Recommended Next Build Step

Create the first real storage/migration layer for:

- provider requests
- leagues
- league seasons
- teams
- venues
- fixtures
- standings
- fixture statistics
- fixture lineups
- fixture events
- player fixture statistics
- squads
- transfers
- injuries
- odds events
- odds snapshots

Then wire a historical-season sync job that imports a completed season once and reads it from the local database thereafter.
