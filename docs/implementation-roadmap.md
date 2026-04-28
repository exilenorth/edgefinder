# EdgeFinder Implementation Roadmap

Last updated: 28 April 2026.

This roadmap reflects the current app after the Assistant/Research refactor, Assistant hierarchy polish, Edge Dashboard, cross-linking, back navigation, provider cache work, historical dossier work, and EPL profile normalisation.

## Product North Star

EdgeFinder should become:

> An honest betting assistant that explains the edge, the risk, the counterargument, and whether the market has already moved.

The app should help users think better. It should not behave like a tipster feed.

## Product Principles

- Separate decisions from evidence.
- Explain both sides of every opportunity.
- Make uncertainty visible.
- Store static historical data locally after the first successful provider fetch.
- Avoid true xG claims until shot-level x/y data exists.
- Build the data layer before making stronger model claims.
- Treat odds movement and closing line value as process feedback, not decoration.

## Current Progress Summary

### Complete Or Substantially Complete

- Product naming: `Assistant` and `Research`.
- Main app refactor into `src/app`, `src/features/assistant`, `src/features/research`, shared components, providers, utils, and model modules.
- Betting Assistant MVP structure.
- Edge Dashboard MVP.
- Assistant decision hierarchy polish.
- Research Hub MVP structure.
- Followable teams and leagues.
- Current versus historical Research modes.
- Season selector for recent seasons.
- EPL current-team normalisation and curated club/stadium profile support.
- API-Football logo/image usage where IDs are available.
- Historical league dossier endpoint and UI.
- Team dossier endpoint and UI sections.
- Backend proxy with local cache.
- Historical archive path for completed seasons.
- Normalized local database schema foundation.
- First fixture snapshot sync into normalized leagues, seasons, teams, venues, fixtures, odds snapshots, and opportunity snapshots.
- Raw The Odds API event snapshots are written to normalized odds tables during live refreshes.
- Fixture odds movement read endpoint exists for future edge-decay UI.
- Assistant/Research cross-linking.
- URL-backed navigation and in-app Back button.

### Partially Complete

- Data freshness and trust UI: visible in Assistant, Research coverage, and cache chips, but not yet comprehensive.
- Provider sync: live services and normalized write paths exist, but UI reads have not moved to repository-backed domain services yet.
- Goal projection model: Poisson-based prototype exists, but not trained, persisted, or audited.
- Opportunity model: best-opportunity snapshots are persisted from fixture refreshes, but shortlist/history workflows do not exist yet.
- Historical data storage: archive and normalized schema exist, but no admin/audit surface or repository-backed historical read workflow yet.
- Player Research: placeholder plus some squad/player data in team dossiers, but no player entity pages.
- Mobile/responsive layout: basic responsive styling exists, but no dedicated mobile UX pass.

### Not Started

- Odds snapshot history.
- Edge decay and first-price/current-price comparison.
- Saved opportunity shortlist.
- Bet history.
- Closing line value.
- Post-match process review.
- Lineup-adjusted opportunity recheck.
- Bet builder / acca sanity checker.
- Automated frontend/model tests.

## Roadmap Stage

We are currently at the transition between:

- **Stage 1: Product shape and decision UX**: mostly complete.
- **Stage 2: Data foundation and persistence**: started, but not yet structurally complete.

The next best priority is Stage 2: normalized local database schema, sync services, odds snapshots, and persisted opportunities. That unlocks the bigger USP features without repeatedly rebuilding the UI.

---

# Stage 1 - Product Shape And Decision UX

Status: **mostly complete**.

## Delivered

- Assistant/Research top-level IA.
- Refactored React app structure.
- Assistant Edge Dashboard.
- Selected fixture Decision Card / thesis flow.
- Reasons, risks, and counterargument panels.
- Candidate / Watch / No clear edge status language.
- Collapsible deeper evidence panels.
- Follow controls moved out of the main decision path.
- Research Hub with current/historical modes.
- Cross-links between Assistant and Research.
- In-app Back button and URL-backed state.

## Remaining Polish

- Make mobile Assistant layout a dedicated pass.
- Add richer empty states everywhere stale/missing data can occur.
- Make trust labels more granular across every model/market panel.
- Group team detail tabs into fewer mobile-friendly categories later.

## Acceptance Criteria

- User can scan opportunities first.
- User can open one selected fixture and understand the thesis, risk, and probabilities.
- User can drill into supporting team/league research and come back.
- User sees prototype/estimated/cached/partial-data context.

Current status: **met for desktop MVP**.

---

# Stage 2 - Data Foundation And Provider Sync

Status: **in progress**.

## Goal

Move EdgeFinder from response caching toward a real local football/odds data layer.

## Why This Matters

The next differentiating features all need memory:

- odds snapshots.
- historical fixture stats.
- saved opportunities.
- first price versus current price.
- closing line value.
- model auditability.
- post-match process review.

## Current Foundation

Already implemented:

- Backend Express proxy.
- `SqliteCache`.
- Fixture list/detail service.
- Team dossier service.
- League historical dossier service.
- Completed-season historical archive path.
- Cache policy helpers for season-aware TTLs.

## Next Implementation Slice

Create a normalized local database layer alongside the existing response cache.

First tables now added:

- `provider_requests`
- `leagues`
- `league_seasons`
- `teams`
- `venues`
- `fixtures`
- `fixture_teams`
- `odds_events`
- `odds_snapshots`
- `opportunities`
- `opportunity_snapshots`

First repositories now added:

- `server/db/migrations.ts`
- `server/repositories/leaguesRepository.ts`
- `server/repositories/teamsRepository.ts`
- `server/repositories/fixturesRepository.ts`
- `server/repositories/oddsRepository.ts`
- `server/repositories/opportunitiesRepository.ts`
- `server/repositories/providerRequestsRepository.ts`
- `server/repositories/domainStatsRepository.ts`

First sync service now added:

- `server/sync/fixtureSnapshotSync.ts`
- `server/sync/oddsSnapshotSync.ts`

Remaining next work:

- Add Assistant UI for odds movement and edge decay.
- Add repository-backed service methods for opportunity history.
- Add saved opportunities/shortlist tables and write paths.
- Add model audit records beyond the first opportunity snapshot input summary.
- Add tests for migrations, repository upserts, and odds snapshot append behaviour.

## Acceptance Criteria

- Static/reference data can be stored in local DB.
- Completed seasons can be archived once and reused.
- Attached market odds snapshots are appended, not overwritten.
- A basic opportunity record is persisted with model price, market price, edge, confidence, and source fixture.

---

# Stage 3 - Goal Projection Model MVP

Status: **prototype exists, production version not started**.

## Current Model

The current model in `src/model/probability.ts`:

- Estimates home/away goals from team attack/defence ratings and recent form proxies.
- Builds a Poisson scoreline matrix.
- Derives 1X2, over 2.5, BTTS, likely scorelines, and anytime scorer probabilities.
- Converts probabilities into fair odds.
- Compares fair probability with market-implied probability where odds exist.

## Required Upgrade

Move the model into a reproducible service that can be audited and stored.

Inputs:

- League average home/away goals.
- Team attack and defence strength.
- Recent form.
- Home advantage.
- Fixture statistics where available.
- Injuries and lineups later.
- Market odds as comparison, not as the source of truth.

Outputs:

- Home expected goals.
- Away expected goals.
- Scoreline matrix.
- Market probabilities.
- Fair odds.
- Edge versus market.
- Confidence.
- Data-quality notes.
- Model input audit record.

## Acceptance Criteria

- Model output is deterministic for a stored input snapshot.
- Model output can be persisted.
- No future data leakage is introduced.
- UI labels it as a projection model, not true xG.

---

# Stage 4 - Odds Movement And Edge Decay

Status: **not started**.

## Goal

Show whether an opportunity is still worth investigating after the market moves.

## Required Data

- The Odds API event IDs.
- Repeated odds snapshots.
- First observed price.
- Current price.
- Best available price by bookmaker where supported.
- Kickoff time.

## UI Output

Example:

```txt
Found at: 2.10
Current: 1.86
Fair price: 1.91
Status: edge gone
```

## Status Labels

- New edge.
- Still value.
- Price moved against us.
- Edge gone.
- Improved price.
- Stale odds.

## Acceptance Criteria

- Odds snapshots are appended.
- Opportunity cards show first/current/fair price.
- Assistant can explain whether the original edge has decayed.

---

# Stage 5 - Lineup-Adjusted Recheck

Status: **not started**.

## Goal

Recalculate confidence and potentially fair prices once confirmed lineups are available.

## Required Provider Data

- API-Football `/fixtures/lineups`.
- API-Football `/players`.
- API-Football `/fixtures/players`.
- API-Football `/injuries`.
- The Odds API event odds refresh.

## Acceptance Criteria

- Assistant shows lineup status.
- Opportunities can be marked as rechecked.
- Missing starters can downgrade confidence.
- Confirmed attacking/defensive changes can alter relevant market confidence.

---

# Stage 6 - Watchlist, Shortlist, And Bet History

Status: **not started**.

## Goal

Turn follow state and opportunity scanning into a user workflow.

## Features

- Watchlist summary from followed teams/leagues.
- Save opportunity to shortlist.
- Add notes.
- Store price and model context at save time.
- Later record result and CLV.

## Acceptance Criteria

- Following a team or league affects a useful personalised view.
- Saved opportunities persist beyond the session.
- Saved records include price/model/freshness context.

---

# Stage 7 - Closing Line Value

Status: **not started**.

## Goal

Measure process quality by comparing selected prices to closing prices.

## Acceptance Criteria

- Saved opportunities can show selected price and closing price.
- CLV percentage can be calculated.
- UI separates process result from bet result.

---

# Stage 8 - Post-Match Process Review

Status: **not started**.

## Goal

After a fixture finishes, review whether the original reasoning was supported by the match data.

## Required Data

- Final score/status.
- Fixture statistics.
- Fixture player stats.
- Fixture events.
- Confirmed lineups.
- Closing odds snapshot.

## Acceptance Criteria

- Finished saved opportunities have process-review labels.
- Red cards, penalties, lineup surprises, and statistical dominance are visible.
- App avoids judging quality solely by win/loss outcome.

---

# Stage 9 - Player Research And Prop Angles

Status: **placeholder only**.

## Goal

Build real player pages and player-market context.

## Required Data

- API-Football `/players`.
- API-Football `/fixtures/players`.
- API-Football `/fixtures/lineups`.
- API-Football `/injuries`.
- API-Football `/players/topscorers`.
- API-Football `/players/topassists`.

## Initial Metrics

- Minutes.
- Starts.
- Goals.
- Assists.
- Goals per 90.
- Assists per 90.
- Shots if available.
- Cards/fouls/tackles if available.
- Availability.
- Scorer-market relevance.

## Acceptance Criteria

- Player pages exist in Research Hub.
- Player rows can be linked from Assistant.
- Player data is grounded in stored provider data.

---

# Stage 10 - Bet Builder / Acca Sanity Checker

Status: **not started**.

## Goal

Let users manually enter a bet, acca, or bet builder and get an honest risk/price warning.

## MVP Scope

- Manual selection entry.
- Market and odds entry.
- Implied probability.
- Estimated fair probability where model supports the market.
- Weakest-leg warning.
- Correlation warning.
- Unsupported-market warning.

## Acceptance Criteria

- Users can check a bet before placing it.
- App explains why a leg looks weak, stale, unsupported, or correlated.

---

# Stage 11 - Mobile And Responsive Layout

Status: **basic support, dedicated pass still needed**.

## Goal

Make Assistant and Research feel intentionally designed on smaller screens.

## Recommended Mobile Assistant Order

1. Edge Dashboard.
2. Selected candidate.
3. Decision summary.
4. Why.
5. Risk.
6. Prices/probabilities.
7. Evidence.

## Acceptance Criteria

- Sidebar becomes drawer/top filter panel.
- Assistant remains scan-first.
- Research detail tabs do not overcrowd.
- Text does not overflow compact panels.

---

# Stage 12 - Testing And Safety Checks

Status: **not started**.

## Recommended Tooling

- Vitest.
- React Testing Library.

## First Tests

- App view navigation.
- URL state parsing/writing.
- Back navigation.
- Followed-only filters.
- Opportunity sorting/filtering.
- Probability utilities.
- Historical archive cache policy.
- Odds snapshot append behaviour once implemented.

## Acceptance Criteria

- Core navigation and follow/filter state are covered.
- Critical betting maths utilities are covered.
- Data/cache policies are protected by tests.

---

# Recommended Next PRs

## PR A - Technical Docs Refresh

Status: current work.

- Update README.
- Add technical specification.
- Update roadmap stage status.

## PR B - Database Schema Foundation

- Add normalized schema/migrations.
- Add repositories for leagues, teams, fixtures, odds, and opportunities.
- Keep existing response cache working.
- Add server checks.

## PR C - Odds Snapshot Ingestion

- Store The Odds API events and market snapshots.
- Add endpoint or service method for refreshing fixture odds.
- Surface snapshot source/freshness in Assistant.

## PR D - Persist Opportunity Snapshots

- Store model output and opportunity summaries.
- Add first seen/current status.
- Prepare for edge decay.

## PR E - Goal Model Audit Output

- Formalize model input/output types.
- Add audit payload.
- Add tests for probability sums and fair odds.

## PR F - Mobile Assistant Pass

- Dedicated mobile ordering.
- Sidebar/filter drawer behaviour.
- Compact decision card and evidence sections.

## PR G - Player Research MVP

- Player entity route/state.
- Player season stats sync.
- Player detail page.
- Assistant scorer-row links into Player Research.

---

# Current Recommendation

Do **PR B - Database Schema Foundation** next.

The UX skeleton is now strong enough. The app will improve most by giving itself memory: normalized fixtures, odds snapshots, persisted opportunities, and model audit records. That foundation makes edge decay, CLV, saved opportunities, lineup rechecks, and post-match review much easier to build cleanly.
