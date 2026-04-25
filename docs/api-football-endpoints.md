# API-Football v3 Endpoint Inventory

Research date: 2026-04-24

Primary documentation URL: https://www.api-football.com/documentation-v3

Note: the official documentation page was Cloudflare-gated from the local shell during research. This inventory is based on the API-Football v3.9.3 endpoint reference mirrored at SportsDataAPI, cross-checked against API-Football's public pricing and coverage pages. The API-Football base URL used by the app remains `https://v3.football.api-sports.io`, authenticated with the `x-apisports-key` header.

Important plan note: API-Football says all plans include all competitions and endpoints, but free plans are limited by season availability. Testing the configured free key against Premier League `season=2025` returned: `Free plans do not have access to this season, try from 2022 to 2024.`

## Quick Summary

| Area | Endpoint count | EdgeFinder relevance |
| --- | ---: | --- |
| Timezone | 1 | Useful for UK-local kickoff display and fixture queries. |
| Countries | 1 | Low priority; mainly discovery/filtering. |
| Leagues | 2 | Important for league IDs, seasons, and coverage flags. |
| Teams | 4 | Important for team IDs, team stats, and discovery. |
| Venues | 1 | Low priority; context only. |
| Standings | 1 | Useful for league position and table context. |
| Fixtures | 7 | Core fixture, H2H, match stats, events, lineups, and player match stats. |
| Injuries | 1 | Important for lineup/scorer risk. |
| Predictions | 1 | Optional benchmark against our model. |
| Coachs | 1 | Low priority; context only. |
| Players | 9 | Important for squads, scorer candidates, and player season stats. |
| Transfers | 1 | Low priority unless modelling squad churn. |
| Trophies | 1 | Not relevant to betting model. |
| Sidelined | 1 | Useful for longer-term player availability context. |
| Odds live | 2 | We already use The Odds API, but this can be an alternate source. |
| Odds pre-match | 4 | Alternate odds source; less important while The Odds API is configured. |

## Endpoint Details

### Timezone

| Method | Endpoint | What it does | Main parameters | Update cadence | EdgeFinder use |
| --- | --- | --- | --- | --- | --- |
| GET | `/timezone` | Lists valid timezone identifiers accepted by fixture requests. | None. | Static; call once. | Use `Europe/London` for UK kickoff display and fixture queries. |

### Countries

| Method | Endpoint | What it does | Main parameters | Update cadence | EdgeFinder use |
| --- | --- | --- | --- | --- | --- |
| GET | `/countries` | Lists countries available for league filtering. | `name`, `code`, `search`. | When a new country/league is added. | Low priority discovery data. |

### Leagues

| Method | Endpoint | What it does | Main parameters | Update cadence | EdgeFinder use |
| --- | --- | --- | --- | --- | --- |
| GET | `/leagues` | Lists leagues and cups, stable league IDs, seasons, and coverage capabilities such as fixtures, events, lineups, fixture stats, player stats, standings, injuries, predictions, and odds. | `id`, `name`, `country`, `code`, `season`, `team`, `type`, `current`, `search`, `last`. | Several times daily. | Critical for confirming whether a league-season has the stats we need before calling expensive endpoints. |
| GET | `/leagues/seasons` | Lists all available season keys. Season keys are four-digit start years, e.g. EPL 2025/26 is `2025`. | None. | When new leagues/seasons are added. | Useful for validating season config and explaining free-plan season limits. |

### Teams

| Method | Endpoint | What it does | Main parameters | Update cadence | EdgeFinder use |
| --- | --- | --- | --- | --- | --- |
| GET | `/teams` | Lists teams and stable team IDs, including team metadata and venue links. Requires at least one parameter. | `id`, `name`, `league`, `season`, `country`, `code`, `venue`, `search`. | Several times weekly. | Core ID resolution for fixtures, team stats, and player stats. |
| GET | `/teams/statistics` | Returns a team's competition-season statistics. Supports a `date` cutoff to calculate stats from season start to that date. | `league`, `season`, `team`, `date`. | Twice daily. | Core for form, goals for/against, clean sheets, scoring/conceding patterns, cards, fixtures played, and model inputs. |
| GET | `/teams/seasons` | Lists seasons available for a given team. Requires at least one parameter. | `team`. | Several times weekly. | Useful for validating whether a promoted/relegated team has season data. |
| GET | `/teams/countries` | Lists countries available for the teams endpoint. | None. | Several times weekly. | Low priority discovery data. |

### Venues

| Method | Endpoint | What it does | Main parameters | Update cadence | EdgeFinder use |
| --- | --- | --- | --- | --- | --- |
| GET | `/venues` | Lists venue metadata. Requires at least one parameter. | `id`, `name`, `city`, `country`, `search`. | Several times weekly. | Optional context; could support home-ground display but not core modelling. |

### Standings

| Method | Endpoint | What it does | Main parameters | Update cadence | EdgeFinder use |
| --- | --- | --- | --- | --- | --- |
| GET | `/standings` | Returns league/team standings. Handles competitions with multiple tables or groups. | `league`, `season`, `team`. | Hourly for active leagues/teams, otherwise daily. | Useful for table position, points, goal difference, and market context. |

### Fixtures

| Method | Endpoint | What it does | Main parameters | Update cadence | EdgeFinder use |
| --- | --- | --- | --- | --- | --- |
| GET | `/fixtures/rounds` | Lists rounds for a league/cup. Round values can filter `/fixtures`. | `league`, `season`, `current`, `dates`, `timezone`. | Daily. | Useful for round navigation and fixture grouping. |
| GET | `/fixtures` | Returns fixtures, live scores, fixture IDs, dates, status, teams, scores, venue, referee, league, and related metadata. Supports UK timezone conversion. | `id`, `ids`, `live`, `date`, `league`, `season`, `team`, `last`, `next`, `from`, `to`, `round`, `status`, `venue`, `timezone`. | Every 15 seconds; recommended once per minute for live/in-progress, otherwise daily. | Core fixture source and the master key for detail endpoints. |
| GET | `/fixtures/headtohead` | Returns historical and upcoming H2H fixtures between two teams. | `h2h`, `date`, `league`, `season`, `last`, `next`, `from`, `to`, `status`, `venue`, `timezone`. | Every 15 seconds; recommended once per minute live, otherwise daily. | Core for H2H section and lightweight model signal. |
| GET | `/fixtures/statistics` | Returns fixture-level team stats for one match. Available stats include shots on/off goal, shots inside/outside box, total shots, blocked shots, fouls, corners, offsides, possession, cards, saves, total passes, accurate passes, and pass percentage. `half=true` adds halftime stats where available from 2024 season onward. | `fixture`, `team`, `type`, `half`. | Every minute for live fixtures, otherwise daily. | Important for post-match analysis and recent-form enrichment. Not the same as true xG. |
| GET | `/fixtures/events` | Returns fixture events: goals, cards, substitutions, and VAR events. VAR events are available from 2020/21 onward where covered. | `fixture`, `team`, `player`, `type`. | Every 15 seconds live, otherwise daily. | Useful for scorers, assists where present, red cards, substitutions, and match narrative. |
| GET | `/fixtures/lineups` | Returns formation, coach, starting XI, substitutes, and player grid positions. Lineups are usually available 20-40 minutes before kickoff when the competition covers the feature; otherwise they may appear after the match. | `fixture`, `team`, `player`, `type`. | Every 15 minutes for in-progress fixtures, otherwise daily. | Very important for scorer probability and "starts likely" replacement once lineups are published. |
| GET | `/fixtures/players` | Returns player statistics from one fixture. | `fixture`, `team`. | Every minute live, otherwise daily. | Useful for player performance history and post-match player-level model features. |

### Injuries

| Method | Endpoint | What it does | Main parameters | Update cadence | EdgeFinder use |
| --- | --- | --- | --- | --- | --- |
| GET | `/injuries` | Lists players not participating, including injured/suspended and questionable statuses. Data exists from April 2021 onward. Requires at least one parameter. | `league`, `season`, `fixture`, `team`, `player`, `date`, `ids`, `timezone`. | Every 4 hours; recommended daily. | Important for availability risk, lineup confidence, and scorer markets. |

### Predictions

| Method | Endpoint | What it does | Main parameters | Update cadence | EdgeFinder use |
| --- | --- | --- | --- | --- | --- |
| GET | `/predictions` | Returns API-Football's prediction for a fixture. It uses algorithms including Poisson distribution, team statistics, last matches, and players. It explicitly does not use bookmaker odds. Includes match winner, win/draw, under/over lines, goals home/away, advice, and comparative team stats. | `fixture`. | Hourly for live/in-progress, otherwise daily. | Useful as an external benchmark against our own probability model. |

### Coachs

| Method | Endpoint | What it does | Main parameters | Update cadence | EdgeFinder use |
| --- | --- | --- | --- | --- | --- |
| GET | `/coachs` | Returns coach information and career history. | `id`, `team`, `search`. | Daily. | Low priority context. |

### Players

| Method | Endpoint | What it does | Main parameters | Update cadence | EdgeFinder use |
| --- | --- | --- | --- | --- | --- |
| GET | `/players/seasons` | Lists seasons available for player statistics. | `player`. | Daily. | Useful for validating season coverage for player stats. |
| GET | `/players/profiles` | Returns player profiles. Can be called without parameters but is paginated at 250 results per page. | `player`, `search`, `page`. | Several times weekly. | Useful for player search/profile data, not stats. |
| GET | `/players` | Returns player profile plus statistics calculated by team, league, and season. Can include rating; paginated at 20 results per page. | `id`, `team`, `league`, `season`, `search`, `page`. | Several times weekly; recommended daily. | Core for season scorer candidates, minutes, goals, assists, cards, appearances, and player model features. |
| GET | `/players/squads` | Returns a team's current squad when called with `team`, or the teams associated with a player when called with `player`. Requires at least one parameter. | `team`, `player`. | Several times weekly; recommended weekly. | Useful for squad discovery even on the free plan, but not enough for current-season stats. |
| GET | `/players/teams` | Returns teams and seasons in which a player has played. Requires at least one parameter. | `player`. | Several times weekly. | Useful for player history and resolving transfers. |
| GET | `/players/topscorers` | Returns top 20 scorers for a league/cup. Ranking considers goals, penalties, assists, matches scored in, minutes, team table position, red cards, and yellow cards. | `league`, `season`. | Several times weekly; recommended daily. | Useful shortcut for scorer probability candidates. |
| GET | `/players/topassists` | Returns top 20 assist providers for a league/cup. | `league`, `season`. | Several times weekly; recommended daily. | Useful for creative-player context and player props. |
| GET | `/players/topyellowcards` | Returns top 20 players with the most yellow cards for a league/cup. | `league`, `season`. | Several times weekly; recommended daily. | Useful for cards markets later. |
| GET | `/players/topredcards` | Returns top 20 players with the most red cards for a league/cup. | `league`, `season`. | Several times weekly; recommended daily. | Useful for disciplinary context. |

### Transfers

| Method | Endpoint | What it does | Main parameters | Update cadence | EdgeFinder use |
| --- | --- | --- | --- | --- | --- |
| GET | `/transfers` | Returns player/team transfer records, including current and future transfers where available. | `player`, `team`. | Several times weekly; recommended daily. | Optional squad-churn context. |

### Trophies

| Method | Endpoint | What it does | Main parameters | Update cadence | EdgeFinder use |
| --- | --- | --- | --- | --- | --- |
| GET | `/trophies` | Returns trophies for a player or coach. | `player`, `players`, `coach`, `coachs`. | Several times weekly; recommended daily. | Not relevant to betting model. |

### Sidelined

| Method | Endpoint | What it does | Main parameters | Update cadence | EdgeFinder use |
| --- | --- | --- | --- | --- | --- |
| GET | `/sidelined` | Returns sidelined history for a player or coach. | `player`, `players`, `coach`, `coachs`. | Several times weekly; recommended daily. | Useful for longer-term absence context, but injuries endpoint is more directly actionable. |

### Odds - In-Play

| Method | Endpoint | What it does | Main parameters | Update cadence | EdgeFinder use |
| --- | --- | --- | --- | --- | --- |
| GET | `/odds/live` | Returns in-play odds for fixtures in progress. Fixtures are added 15-5 minutes before start and removed 5-20 minutes after final whistle; no history is stored. Includes status flags such as stopped, blocked, and finished. | `fixture`, `league`, `bet`. | Every 5-60 seconds depending on availability. | Alternate live odds source. Current app primarily uses The Odds API. |
| GET | `/odds/live/bets` | Lists available bet IDs/names for in-play odds. Not compatible with pre-match `/odds`. | `id`, `search`. | Every 60 seconds. | Needed only if using API-Football live odds. |

### Odds - Pre-Match

| Method | Endpoint | What it does | Main parameters | Update cadence | EdgeFinder use |
| --- | --- | --- | --- | --- | --- |
| GET | `/odds` | Returns pre-match odds by fixture, league, or date. Odds are available 1-14 days before fixture; a 7-day history is kept. Paginated at 10 results per page. Availability varies by league, season, fixture, and bookmaker. | `fixture`, `league`, `season`, `date`, `timezone`, `page`, `bookmaker`, `bet`. | Every 3 hours. | Alternate pre-match odds source. The Odds API remains cleaner for our current odds pipeline. |
| GET | `/odds/mapping` | Lists fixture IDs available for the `/odds` endpoint. Paginated at 100 results per page. | `page`. | Daily. | Useful if mapping API-Football fixture IDs to odds coverage. |
| GET | `/odds/bookmakers` | Lists available bookmakers. | `id`, `search`. | Several times weekly; recommended daily. | Useful if using API-Football odds and filtering bookmakers. |
| GET | `/odds/bets` | Lists available pre-match bet IDs/names. Not compatible with `/odds/live`. | `id`, `search`. | Several times weekly; recommended daily. | Needed only if using API-Football pre-match odds. |

## Modelling Implications For EdgeFinder

### Best endpoints to integrate first

1. `/leagues` to cache coverage by league-season before requesting details.
2. `/fixtures` to replace Odds API placeholder fixtures when paid current-season access is available.
3. `/teams/statistics` for team form and season performance.
4. `/standings` for table context.
5. `/fixtures/headtohead` for H2H.
6. `/players`, `/players/topscorers`, and `/players/squads` for scorer candidate modelling.
7. `/injuries` and `/fixtures/lineups` for availability and starting XI confidence.
8. `/fixtures/statistics`, `/fixtures/events`, and `/fixtures/players` for post-match enrichment and recent performance history.

### xG caveat

The documented API-Football fixture statistics list normal match stats such as shots, possession, corners, cards, saves, and passes. I did not find native expected-goals (`xG`) fields in the v3 endpoint reference. If true xG is a hard requirement, EdgeFinder likely needs a separate xG provider or an internal approximate model using shot volume/location-like proxies where available.

### Cache guidance

The published update cadences suggest these backend cache TTLs:

| Data type | Suggested TTL |
| --- | ---: |
| Static discovery: timezones, countries, seasons | 7-30 days |
| Leagues/coverage, teams, venues, squads, coaches | 1 day to 1 week |
| Standings, predictions | 1 hour during matchdays; 1 day otherwise |
| Fixtures not in play | 15 minutes to 1 day depending on date proximity |
| Live fixtures/events/stats | 15-60 seconds |
| Lineups close to kickoff | 5-15 minutes |
| Injuries | 4 hours |
| Team/player season stats | 12-24 hours |
| Pre-match odds | 3 hours |
| Live odds | 5-60 seconds |

## Sources

- API-Football documentation: https://www.api-football.com/documentation-v3
- API-Football coverage: https://www.api-football.com/coverage
- API-Football pricing: https://www.api-football.com/pricing
- v3.9.3 endpoint reference mirror used for accessible endpoint text: https://sportsdataapi.com/sports-api/football/documentation
