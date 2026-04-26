# EdgeFinder Implementation Roadmap

This roadmap replaces the earlier split between the design implementation roadmap and the USP feature addendum. It is now the single roadmap for turning EdgeFinder from a fixture-and-stats dashboard into a differentiated betting decision-support product.

EdgeFinder should be built around two connected product areas:

1. **Betting Assistant** — a fast, opinionated decision area for finding and understanding potential betting opportunities.
2. **Research Hub** — a deep evidence area for leagues, teams, players, fixtures, and historical data.

The product should not become another generic tips app. The strongest direction is:

> **An honest betting assistant that explains the edge, the risk, the counterargument, and whether the market has already moved.**

The app should help users think better, not blindly follow picks.

---

## Product Principles

### 1. Separate decisions from evidence

The Betting Assistant should summarise, prioritise, and explain.

The Research Hub should let users inspect the underlying evidence.

Do not overload the Assistant with every stat. If a user wants depth, link them into Research.

### 2. Explain both sides of every opportunity

Every highlighted opportunity should eventually answer:

1. What is the potential bet?
2. Why might it be value?
3. What could make it wrong?
4. Is the current price still playable?

This is the core USP.

### 3. Make uncertainty visible

Recommendations should show:

- Confidence level.
- Data freshness.
- Key reasons.
- Key risks.
- Counterarguments.
- Whether inputs are live, cached, estimated, partial, or unavailable.

A betting app that always sounds certain will feel dodgy. EdgeFinder should be useful because it is honest.

### 4. Build structure before sophistication

The first UI phases should establish the product shape. The model and data depth can then improve without needing to redesign the app again.

### 5. Do not overclaim xG

API-Football appears suitable for fixture-level expected goals projections, but not true shot-location xG unless shot-level coordinates are confirmed or another provider is added.

Use names like:

- Goal Projection Model.
- Expected Goals Forecast.
- EdgeFinder Goal Model.

Avoid claiming true shot-based xG unless the data genuinely supports it.

---

## Current State

The app currently has the beginnings of the split:

- `AppView = "fixtures" | "stats"`.
- Sidebar buttons for `Fixtures` and `Stats`.
- Fixture-led analysis in the main workspace.
- A stats workspace with league/team browsing, current/historical mode, search, followed-only filtering, and season selection.
- Live provider clients for API-Football and The Odds API.
- Backend proxy and SQLite-compatible cache.

The current structure is a solid prototype, but the naming and hierarchy are still feature-led rather than outcome-led.

The immediate UX move is:

```txt
Fixtures / Stats
```

To:

```txt
Betting Assistant / Research Hub
```

---

# Phase 1 — Product Language and Navigation

## Goal

Make the app clearly feel like two connected product areas.

## Changes

Rename the top-level sections:

- `Fixtures` → `Assistant` in compact navigation.
- `Stats` → `Research` in compact navigation.
- Page heading: `Betting Assistant`.
- Page heading: `Research Hub`.

## Code changes

Rename the view type:

```ts
type AppView = "fixtures" | "stats";
```

To:

```ts
type AppView = "assistant" | "research";
```

Update state and comparisons:

```ts
const [appView, setAppView] = React.useState<AppView>("assistant");
```

Replace:

```tsx
appView === "fixtures"
appView === "stats"
```

With:

```tsx
appView === "assistant"
appView === "research"
```

## Acceptance criteria

- Sidebar has clear `Assistant` and `Research` navigation items.
- Top-level sections are no longer presented as generic fixtures/stats.
- Existing functionality still works.
- No model or provider logic changes.

---

# Phase 2 — Main File Refactor

## Goal

Split the current large `src/main.tsx` into smaller feature components before deeper UI work.

This should be behaviour-preserving. Do not attempt the full redesign during the refactor.

## Suggested structure

```txt
src/
  app/
    App.tsx
    AppShell.tsx
    Sidebar.tsx
    main.tsx

  features/
    assistant/
      BettingAssistantWorkspace.tsx
      AssistantSidebarContent.tsx
      FixtureAnalysis.tsx
      EdgeDashboard.tsx
      EdgeSummaryCard.tsx
      ProbabilityTile.tsx
      FollowPanel.tsx
      TeamFormPanel.tsx
      ExpectedGoalsPanel.tsx
      HeadToHeadPanel.tsx
      ScorelinesPanel.tsx
      ScorerMarketsPanel.tsx
      thesis/
        BetThesisPanel.tsx
      risk/
        RiskFlagsPanel.tsx
        CounterargumentPanel.tsx
      sanity-checker/
        BetSanityChecker.tsx

    research/
      ResearchHubWorkspace.tsx
      ResearchSidebarContent.tsx
      ResearchToolbar.tsx
      EntityBrowser.tsx
      LeagueDetail.tsx
      TeamDetail.tsx
      HistoricalLeagueDetail.tsx
      players/
        PlayerResearchPlaceholder.tsx
      coverage/
        CoveragePanel.tsx

  components/
    Panel.tsx
    Metric.tsx
    LogoMark.tsx
    EmptyState.tsx
    LoadingState.tsx
    DataFreshnessChip.tsx

  hooks/
    useFollows.ts
    useFixtures.ts
    useFixtureSelection.ts

  utils/
    fixtureFilters.ts
    formatting.ts
```

## Refactor order

1. Move ReactDOM bootstrap into `src/app/main.tsx`.
2. Move the current `App` component into `src/app/App.tsx`.
3. Extract the sidebar into `Sidebar.tsx`.
4. Extract Assistant-specific content into `features/assistant`.
5. Extract Research-specific content into `features/research`.
6. Move generic UI primitives into `components`.
7. Move filtering/formatting helpers into `utils`.

## Acceptance criteria

- `src/main.tsx` becomes small and only mounts the app.
- Assistant and Research code are separated.
- Shared UI components are reusable.
- The app builds successfully.
- No major visual redesign is attempted.

---

# Phase 3 — Betting Assistant MVP

## Goal

Make the Assistant feel like a decision-support area rather than a plain fixture browser.

## Assistant layout

```txt
Betting Assistant
Football opportunities, confidence, and fixture-level reasoning.

[Assistant summary cards]
- Fixtures loaded
- Followed fixtures
- Potential edges
- Data freshness

[Top opportunities]
- Best available opportunities by edge/confidence

[Selected fixture analysis]
- Verdict
- Bet thesis
- Reasons
- Risks
- Evidence panels
```

## Fixture analysis hierarchy

A fixture page should lead with the decision, not raw data.

Recommended order:

1. Fixture identity.
2. Verdict card.
3. Confidence/freshness chips.
4. Best opportunity.
5. Bet thesis.
6. Why this edge?
7. Counterargument / key risks.
8. Market probability tiles.
9. Evidence panels.
10. Links into Research Hub.

## Bet thesis placeholder

Even before the model is mature, reserve space for structured explanation.

Example:

```txt
Bet thesis
- Market: Over 2.5 goals
- Current price: 1.95
- Model fair price: 1.78
- Estimated edge: +4.9 percentage points
- Why this edge exists: both teams profile above league average for attacking output and concede above-average shot volume
- Main risk: lineups not confirmed
- Verdict: playable only above 1.85
```

Initial content can be deterministic and labelled as prototype/estimated.

## Suggested domain type

```ts
interface BetThesis {
  fixtureId: string;
  marketKey: string;
  selection: string;
  modelProbability?: number;
  marketProbability?: number;
  currentPrice?: number;
  fairPrice?: number;
  edge?: number;
  confidence: "low" | "medium" | "high";
  dataQuality: "live" | "cached" | "estimated" | "partial" | "unavailable";
  reasons: string[];
  risks: string[];
  counterArguments: string[];
  verdict: string;
}
```

## Acceptance criteria

- Assistant has a clear product heading.
- The best-edge card feels like the primary decision element.
- Every highlighted opportunity has at least one reason and one risk.
- Placeholder/estimated values are labelled clearly.
- The user understands the Assistant is for investigation, not blind betting.

---

# Phase 4 — Research Hub MVP

## Goal

Make the current stats area feel like a proper evidence terminal.

## Rename and reposition

Current copy:

```txt
Stats Centre
League and team intelligence
```

Recommended copy:

```txt
Research Hub
League, team, player, and fixture intelligence
```

## Initial tabs

```txt
Leagues | Teams | Players
```

Players can be marked as coming soon at first.

Suggested copy:

```txt
Players coming soon
Player-level research will include minutes, goals, assists, starts likelihood, injuries, shots, cards, and scorer-market relevance.
```

## Entity-led detail pages

### League Research

Sections:

- Overview.
- Table / standings.
- Fixture list.
- Teams.
- Goal trends.
- Form trends.
- Historical seasons.
- Coverage/data availability.

### Team Research

Sections:

- Overview.
- Form.
- Attack.
- Defence.
- Squad.
- Injuries.
- Lineups.
- Manager.
- Stadium.
- Transfers.
- Upcoming analysed fixtures.

### Player Research

Sections for later:

- Overview.
- Minutes and starts.
- Goals and assists.
- Shots and shots on target.
- Cards/fouls/tackles if available.
- Recent form.
- Injury/availability.
- Scorer-market relevance.
- Related fixtures.

## Acceptance criteria

- Research Hub is clearly named and framed.
- Leagues and teams remain browsable.
- The structure leaves a clear slot for players.
- Research pages feel like evidence pages, not recommendation pages.

---

# Phase 5 — Edge Dashboard and Opportunity Model

## Goal

Create a scan-first Assistant landing view and start moving from fixture analysis to opportunity analysis.

## Recommended view

```txt
Edge Dashboard

Top opportunities
------------------------------------------------
Fixture              Market       Edge   Confidence   Status      Kickoff
Arsenal v Chelsea    Over 2.5     +6.2%  Medium       Playable    Today 17:30
Villa v Spurs        BTTS Yes     +4.8%  Low          Watch       Today 20:00

Filters
Today | 24h | Weekend | Following | League | Market
```

## Initial implementation

Start simple:

- Reuse the existing `fixtures` array.
- Calculate `analyseFixture(fixture)` for each visible fixture.
- Extract `bestMarket` from each analysis.
- Sort by highest positive edge.
- Display top 5.
- Clicking a row selects the fixture below.

## Upgrade target

Move toward an opportunity model:

```ts
interface OpportunitySummary {
  id: string;
  fixtureId: string;
  marketKey: string;
  selection: string;
  price?: number;
  fairPrice?: number;
  edge?: number;
  confidence: "low" | "medium" | "high";
  status: "new" | "playable" | "edge_gone" | "stale" | "watch";
  reasons: string[];
  risks: string[];
}
```

This becomes the bridge to odds movement, edge decay, saved opportunities, CLV, and post-match review.

## Empty state

```txt
No positive edges found for the current filters.
Try widening the date range or checking back after odds refresh.
```

## Acceptance criteria

- Assistant opens with a scan-first opportunity section.
- Top opportunities are sorted by estimated edge.
- Confidence, freshness, and status are visible.
- Empty/no-edge states are clear.

---

# Phase 6 — Cross-Linking Assistant and Research

## Goal

Make the two product areas work together.

## Assistant to Research links

From Fixture Analysis:

- Home team badge/name → Team Research.
- Away team badge/name → Team Research.
- League name → League Research.
- Player row → Player Research when available.
- Evidence point → relevant research section.

Examples:

- `Lineups not confirmed` → Fixture Research / Lineups.
- `Away defence allowing high shot volume` → Away Team Research / Defence.
- `Market moved against this price` → Fixture Research / Odds Movement.
- `Key forward injured` → Team Research / Injuries.

## Research to Assistant links

From Team Research:

- Show upcoming fixtures for the team.
- Show whether any fixture has a highlighted opportunity.
- Link back to Fixture Analysis.

From League Research:

- Show upcoming league fixtures.
- Show top opportunities in that league.

From Player Research:

- Show upcoming fixtures involving the player's team.
- Show scorer/player markets if available.

## Lightweight navigation state

```ts
type ResearchEntity =
  | { type: "league"; id: string; name: string }
  | { type: "team"; id: string; name: string }
  | { type: "player"; id: string; name: string }
  | { type: "fixture"; id: string; name: string };
```

```ts
function openResearch(entity: ResearchEntity) {
  setAppView("research");
  setSelectedResearchEntity(entity);
}
```

Later, move to React Router if direct URLs become important.

## Acceptance criteria

- Users can move from Assistant to supporting evidence.
- Users can move from Research back to relevant fixtures/opportunities.
- The product does not feel like two disconnected apps.

---

# Phase 7 — Data Freshness, Coverage, and Trust UI

## Goal

Make users aware of what is live, stale, estimated, missing, cached, partial, or unavailable.

## Data quality enum

```ts
type DataQuality = "live" | "cached" | "estimated" | "partial" | "unavailable";
```

## Freshness chips

Examples:

```txt
Odds refreshed 4m ago
Stats refreshed 2h ago
Lineups not confirmed
Using cached data
Using estimated inputs
Coverage unavailable for player statistics
```

## Coverage panel

Use API-Football `/leagues` coverage flags to show whether the selected league/season supports:

- fixture events.
- lineups.
- fixture statistics.
- player fixture statistics.
- standings.
- players.
- top scorers.
- top assists.
- injuries.
- predictions.
- odds.

## Where to show freshness/trust data

- Assistant verdict card.
- Opportunity rows.
- Bet thesis panel.
- Risk flags panel.
- Market rows.
- Player/scorer rows.
- Research detail headers.
- Coverage/data availability panels.

## Acceptance criteria

- Users can see data quality at a glance.
- Assistant recommendations do not look more certain than they are.
- Research Hub explains coverage gaps clearly.

---

# Phase 8 — Database Schema and Provider Sync

## Goal

Move from a response cache toward a proper local data layer that supports modelling, odds movement, and post-match analysis.

## Why this matters

The deeper USP features require memory:

- odds snapshots.
- historical fixture stats.
- saved opportunities.
- closing line value.
- model input auditability.
- post-match review.

Without a proper data layer, EdgeFinder remains mostly a live API wrapper.

## Core tables

Add migrations and repositories for:

- `provider_requests`.
- `leagues`.
- `league_seasons` / coverage.
- `teams`.
- `venues`.
- `fixtures`.
- `fixture_statistics`.
- `fixture_players` or raw player match stats.
- `fixture_events`.
- `fixture_lineups`.
- `team_statistics`.
- `players`.
- `player_season_statistics`.
- `injuries`.
- `transfers`.
- `odds_events`.
- `odds_snapshots`.
- `opportunities`.
- `opportunity_snapshots`.

## Provider sync services

Suggested files:

```txt
server/sync/
  syncLeagues.ts
  syncTeams.ts
  syncFixtures.ts
  syncFixtureStatistics.ts
  syncFixturePlayers.ts
  syncLineups.ts
  syncInjuries.ts
  syncOdds.ts
```

Each service should answer:

```txt
Do we already have this data?
Is it fresh enough?
Should we fetch from provider?
Should we archive it permanently?
```

## Acceptance criteria

- Static/reference data is stored locally.
- Completed fixture data can be archived.
- Odds are stored as snapshots, not overwritten.
- App services can read from DB first and provider second.

---

# Phase 9 — Goal Projection Model MVP

## Goal

Build a pragmatic fixture-level goal model that outputs probabilities and fair prices.

This is not true shot-based xG. It is a goal projection model based on historical/team/player context.

## Inputs

API-Football:

- `/fixtures` — historical fixtures, teams, scores, home/away, dates.
- `/fixtures/statistics` — team match stats where available.
- `/teams/statistics` — season-level team profile.
- `/standings` — league/team context.
- `/injuries` — availability context.
- `/fixtures/lineups` — later lineup adjustment.

The Odds API:

- `/v4/sports/{sport}/odds` — current market prices.
- optional use as a calibration signal later.

## Outputs

- Home expected goals.
- Away expected goals.
- 1X2 probabilities.
- Over/under probabilities.
- BTTS probability when implemented.
- Fair odds.
- Edge versus market odds.
- Model confidence.

## Implementation path

Start simple:

1. League average home/away goals.
2. Team attacking strength.
3. Team defensive strength.
4. Home advantage.
5. Recent-form weighting with guardrails.
6. Poisson scoreline matrix.
7. Derived market probabilities.

Then improve with:

- fixture statistics.
- opponent-adjusted strength.
- injuries.
- lineups.
- player availability.
- calibration against historical results and market close.

## Acceptance criteria

- Model outputs are reproducible and stored.
- UI labels the model as projection/forecast, not true xG.
- Fair prices can feed the Edge Dashboard.
- No future data leakage is introduced.

---

# Phase 10 — Odds Movement and Edge Decay

## Goal

Show whether a previously identified opportunity is still playable.

## Assistant output

```txt
Edge status
- Found at: 2.10
- Current: 1.86
- Fair price: 1.91
- Status: edge gone
```

## Required data

The Odds API:

- `/v4/sports/{sport}/odds` — recurring market snapshots.
- `/v4/sports/{sport}/events/{eventId}/odds` — selected fixture refresh.
- bookmaker/market `last_update` fields.

Internal database:

- `odds_events`.
- `odds_snapshots`.
- `opportunities`.
- `opportunity_snapshots`.

## Status labels

- `New edge`.
- `Still playable`.
- `Price moved against us`.
- `Edge gone`.
- `Improved price`.
- `Stale odds`.

## Acceptance criteria

- Odds snapshots are never overwritten.
- Opportunity cards show first price, current price, fair price, and status.
- Users can see when an edge has disappeared.

---

# Phase 11 — Lineup-Adjusted Recheck

## Goal

Recalculate confidence and possibly fair prices once confirmed lineups are available.

This can become one of EdgeFinder's clearest USPs:

> **The app re-checks the edge when lineups drop.**

## Required data

API-Football:

- `/fixtures/lineups` — formation and starting XI.
- `/players` — player season stats, minutes, goals, assists, appearance history.
- `/fixtures/players` — historical player match stats where available.
- `/injuries` — known absences.

The Odds API:

- `/v4/sports/{sport}/events/{eventId}/odds` — refresh selected fixture odds after lineups.

## Suggested model object

```ts
interface LineupContext {
  fixtureId: string;
  homeFormation?: string;
  awayFormation?: string;
  homeStartXI: string[];
  awayStartXI: string[];
  confirmedAt?: string;
  confidenceImpact: "positive" | "neutral" | "negative" | "unknown";
  notes: string[];
}
```

## Initial rules

- If lineups unavailable: `lineupStatus = "unconfirmed"`.
- If expected starters are missing: downgrade confidence.
- If key attacking players start: upgrade attacking/scorer/goal-market confidence.
- If defensive starters are missing: upgrade opponent goals/BTTS/overs confidence.

## Acceptance criteria

- Assistant shows lineup status clearly.
- Opportunities can be marked as rechecked after lineups.
- Confidence can change based on lineup context.

---

# Phase 12 — Watchlist, Shortlist, and Bet History

## Goal

Make followed entities and saved opportunities useful.

## Watchlist

Assistant summary:

```txt
Your Watchlist
3 fixtures today
1 possible edge
2 fixtures awaiting fresh odds
```

Research Hub:

```txt
Followed teams
Followed leagues
Recently viewed
```

## Shortlist

Allow users to save an opportunity with:

- fixture.
- market.
- selection.
- price at save time.
- fair price at save time.
- edge.
- note.
- confidence.
- saved timestamp.

This creates the foundation for CLV and post-match review.

## Acceptance criteria

- Following a team/league has visible value.
- Saved opportunities persist.
- Saved opportunity records include price/model context at save time.

---

# Phase 13 — Closing Line Value Tracking

## Goal

Track whether EdgeFinder beats the closing market, not just whether the bet won.

This teaches good process and avoids outcome-chasing.

## Required data

The Odds API:

- odds snapshots close to kickoff.
- final pre-kickoff odds where available from repeated polling.
- historical odds if the plan supports it.

API-Football:

- `/fixtures` — kickoff time and final result/status.

Internal database:

- odds snapshots.
- saved opportunities.
- final result state.

## Derived fields

```txt
selected_price
closing_price
closing_line_value_percent
beat_closing_line: true/false
result: won/lost/push/void/unknown
```

## UI rule

Separate:

- **Process result** — did the price beat close?
- **Bet result** — did it win?

## Acceptance criteria

- Saved opportunities can show closing price.
- CLV can be calculated where closing data exists.
- UI clearly separates CLV from win/loss result.

---

# Phase 14 — Post-Match Process Review

## Goal

After a fixture finishes, explain whether the original reasoning was good, lucky, unlucky, or wrong.

## Example output

```txt
Result: Lost
Process review: Reasonable bet. The selection lost, but the underlying match stats supported the thesis: shot volume, territory, and chance quality proxies were aligned with the model. No major model downgrade suggested.
```

## Required data

API-Football:

- `/fixtures` — final score/status.
- `/fixtures/statistics` — match-level team stats.
- `/fixtures/players` — player performance stats.
- `/fixtures/events` — red cards, penalties, substitutions, goal timing.
- `/fixtures/lineups` — confirmed teams.

The Odds API:

- closing odds from stored snapshots.

## Review dimensions

- Did the closing line move in favour of the recommendation?
- Did match stats support the thesis?
- Were there major events that distorted the result?
- Did missing/rotated players invalidate the pre-match assumption?
- Did the bet win despite bad process?
- Did the bet lose despite good process?

## Acceptance criteria

- Finished saved opportunities can show a process review.
- Review labels are clearly explained.
- The app does not treat win/loss as the only success measure.

---

# Phase 15 — Player Research and Prop Angles

## Goal

Use player data to make Research Hub deeper and eventually support player-market insights.

## Required data

API-Football:

- `/players` — season-level player stats.
- `/fixtures/players` — per-match player stats.
- `/fixtures/lineups` — starts/formation.
- `/injuries` — availability.
- `/players/topscorers`.
- `/players/topassists`.

The Odds API:

- only if player prop markets are available for the selected sport/plan.

## Initial Research metrics

- minutes per appearance.
- start rate.
- goals per 90.
- assists per 90.
- shots per match if available.
- shots on target per match if available.
- cards/fouls/tackles if available.
- injury/availability status.

## Acceptance criteria

- Player pages exist in Research Hub.
- Player stats are grounded in stored provider data.
- Player angles can be linked from Assistant once stable.

---

# Phase 16 — Bet Builder / Acca Sanity Checker

## Goal

Let users manually enter a bet, acca, or bet builder and get an honest warning before placing it.

This is a strong casual-user feature, but it should come after the core opportunity engine is stable.

## MVP scope

Manual entry:

```txt
Selection
Market
Odds
Fixture
```

Output:

- implied probability.
- estimated fair probability if model supports the market.
- weakest leg.
- correlation warning.
- price warning.
- suggested removal or safer alternative.

## Initial supported markets

- 1X2.
- Totals.
- BTTS when model exists.
- Simple multiple-leg probability multiplication.
- Obvious correlation warnings.

## Acceptance criteria

- Users can manually enter selections.
- App explains implied probability and rough risk.
- App warns when a leg is weak, stale, unsupported, or likely over-correlated.

---

# Phase 17 — Mobile and Responsive Layout

## Goal

Make the two-section design usable on smaller screens.

## Recommended behaviour

Desktop:

```txt
Sidebar | Main workspace
```

Tablet:

```txt
Collapsible sidebar | Main workspace
```

Mobile:

```txt
Top navigation
Filter drawer
Main workspace full width
```

## Assistant mobile order

1. Verdict.
2. Price/edge.
3. Reasons.
4. Risks.
5. Actions.
6. Evidence links.

## Initial CSS breakpoint

```css
@media (max-width: 900px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .fixture-rail {
    position: static;
  }

  .match-header,
  .follow-panel,
  .score-strip,
  .dashboard-grid,
  .stats-centre,
  .stats-toolbar {
    grid-template-columns: 1fr;
  }
}
```

## Acceptance criteria

- App is usable below 900px width.
- Assistant remains scan-friendly on mobile.
- Thesis/risk panels stack cleanly.
- Research detail pages stack cleanly.

---

# Phase 18 — Testing and Safety Checks

## Goal

Protect the app as the UI, data layer, and model grow.

## Recommended tooling

Add later:

- Vitest.
- React Testing Library.

## Useful tests

### UI state tests

- Switching between Assistant and Research works.
- Selecting a fixture updates Assistant detail.
- Following a team persists and affects filters.
- Research search filters teams/leagues.
- Historical mode handles loading/errors.

### Assistant tests

- Edge summary handles positive, neutral, stale, and missing data states.
- Bet thesis renders reasons, risks, and counterarguments.
- Opportunity rows sort by edge/confidence.
- Empty states render correctly.

### Data/model tests

- Fixture grouping is stable.
- Odds snapshots are appended, not overwritten.
- Implied probability conversion is correct.
- Poisson scoreline probabilities sum to a sensible range.
- Model feature generation does not leak future data.
- CLV calculation is correct.

## Acceptance criteria

- Core navigation is covered.
- Follow/filter state is covered.
- Major empty/loading states are covered.
- Critical betting maths utilities are covered.

---

# API Endpoint Map

## API-Football

| Endpoint | Use in EdgeFinder | First roadmap phase |
|---|---|---|
| `/leagues` | League metadata and coverage flags | Phase 7 / Phase 8 |
| `/fixtures` | Fixtures, results, status, venue, teams | Existing / Phase 8 |
| `/fixtures/headtohead` | H2H context | Existing / Phase 4 |
| `/fixtures/statistics` | Team match stats, process review, model inputs | Phase 8 / Phase 9 |
| `/fixtures/players` | Player match stats, prop research, process review | Phase 14 / Phase 15 |
| `/fixtures/events` | Goals/cards/subs/VAR timeline and distortion context | Phase 14 |
| `/fixtures/lineups` | Confirmed XI, formation, lineup-adjusted edge detection | Phase 11 |
| `/teams` | Team profile and venue | Existing / Phase 8 |
| `/teams/statistics` | Team season profile, attack/defence indicators | Phase 4 / Phase 9 |
| `/players/squads` | Squad list | Phase 4 / Phase 15 |
| `/players` | Player season stats and profiles | Phase 15 |
| `/players/topscorers` | League/player research | Existing / Phase 4 |
| `/players/topassists` | League/player research | Existing / Phase 4 |
| `/injuries` | Availability and risk flags | Phase 7 / Phase 11 |
| `/standings` | League table and context | Existing / Phase 4 |
| `/transfers` | Squad churn/context | Phase 4 / Phase 15 |
| `/predictions` | Optional external second opinion, not core model | Later validation |

## The Odds API

| Endpoint | Use in EdgeFinder | First roadmap phase |
|---|---|---|
| `/v4/sports` | Validate available sports/keys | Phase 8 |
| `/v4/sports/{sport}/events` | Event list for matching | Phase 8 |
| `/v4/sports/{sport}/odds` | Main bookmaker odds feed | Existing / Phase 10 |
| `/v4/sports/{sport}/events/{eventId}/odds` | Fixture detail odds refresh | Phase 10 / Phase 11 |
| Historical odds endpoints, if plan supports | CLV backfill and review | Phase 13 |

---

# Suggested PR Delivery Plan

## PR 1 — Product docs

Status: current PR.

Includes:

- `docs/product-structure.md`.
- `docs/implementation-roadmap.md`.
- `docs/api-provider-feature-map.md`.
- `docs/data-storage-strategy.md`.
- README updates.

## PR 2 — Naming and navigation

Includes:

- Rename `fixtures`/`stats` view values to `assistant`/`research`.
- Update sidebar copy.
- Update page headings.
- No provider/model behaviour changes.

## PR 3 — Main file refactor

Includes:

- Split `src/main.tsx` into smaller files.
- Create Assistant/Research feature folders.
- Preserve existing behaviour.
- No major redesign.

## PR 4 — Assistant MVP polish

Includes:

- Assistant heading and description.
- Stronger verdict card.
- `BetThesisPanel` placeholder.
- `CounterargumentPanel` placeholder.
- `RiskFlagsPanel` placeholder.
- `DataFreshnessChip` component.

## PR 5 — Research Hub MVP polish

Includes:

- Rename Stats Centre to Research Hub.
- Add player tab placeholder.
- Add coverage/data availability panel.
- Add Team attack/defence/injuries/lineups sections.
- Improve research toolbar and empty states.

## PR 6 — Edge Dashboard

Includes:

- Top opportunities list.
- Sort by estimated edge.
- Opportunity summary type.
- Empty state for no opportunities.
- Click row to select fixture.

## PR 7 — Cross-linking

Includes:

- Assistant team/league/player links into Research.
- Research upcoming fixtures links back to Assistant.
- Lightweight selected research entity state.

## PR 8 — Database schema and provider sync

Includes:

- Schema/migrations.
- Repository layer.
- Provider request metadata.
- Reference data sync.
- Fixture sync.
- Coverage sync.
- Initial odds event/snapshot tables.

## PR 9 — Goal Projection Model MVP

Includes:

- Fixture-level goal projection.
- Poisson market probabilities.
- Fair odds.
- No true xG claims.
- Basic model audit output.

## PR 10 — Wire model output into Assistant

Includes:

- Edge Dashboard powered by model probabilities.
- Bet thesis rules using model output.
- Risk flags using data quality and coverage.

## PR 11 — Odds movement and edge decay

Includes:

- Odds snapshot ingestion.
- Opportunity first/current price.
- Edge status labels.
- Market movement UI.

## PR 12 — Lineup-adjusted recheck

Includes:

- Lineup sync/use in Assistant.
- Lineup status chip.
- Missing starter flags.
- Confidence adjustment.
- Event-specific odds refresh after lineups.

## PR 13 — Watchlist, shortlist, and bet history

Includes:

- Save opportunity.
- Notes.
- Price/model context at save time.
- Watchlist decision feed.

## PR 14 — Closing line value

Includes:

- Closing price lookup from odds snapshots.
- CLV calculation.
- Process result versus bet result.

## PR 15 — Post-match process review

Includes:

- Final fixture stats ingestion.
- Event context.
- Thesis review.
- Lucky/unlucky/process-good/process-bad labels.

## PR 16 — Player research and prop angles

Includes:

- Player pages.
- Player season stats.
- Player match-stat trends where available.
- Player availability context.

## PR 17 — Bet builder / acca sanity checker

Includes:

- Manual bet entry.
- Implied probability.
- Fair probability where supported.
- Weakest-leg and correlation warnings.

## PR 18 — Responsive layout

Includes:

- Mobile/tablet breakpoints.
- Stacked Assistant panels.
- Stacked Research detail pages.

## PR 19 — Testing and safety checks

Includes:

- UI state tests.
- Assistant component tests.
- Data/model utility tests.
- Betting maths tests.

---

# Recommended Build Order

The practical order is:

1. Finish and merge product docs.
2. Rename navigation.
3. Refactor the main React file.
4. Add Assistant thesis/risk placeholders.
5. Add Research Hub evidence slots and coverage display.
6. Add Edge Dashboard.
7. Add cross-linking.
8. Build proper database schema and provider sync.
9. Store odds snapshots.
10. Build the Goal Projection Model MVP.
11. Wire model output into opportunities and thesis generation.
12. Add odds movement and edge decay.
13. Add lineup-adjusted rechecks.
14. Add shortlist/bet history.
15. Add CLV.
16. Add post-match process reviews.
17. Add player research/prop angles.
18. Add bet builder/acca sanity checker.
19. Harden responsive layout and tests.

This keeps the product honest. The UI establishes the correct mental model early, but the deeper claims only become authoritative once the data layer and model layer can support them.

---

# Backlog Ideas

## Assistant backlog

- Market filters: 1X2, totals, BTTS, scorer markets.
- Save opportunity to shortlist.
- Add notes to shortlisted opportunities.
- Alerts when odds move.
- Best bookmaker comparison.
- Model disagreement flag.
- No-bet recommendations.
- Daily betting health check.

## Research backlog

- Team comparison view.
- Player comparison view.
- League season comparison.
- Referee data if provider is added.
- Venue/home-away splits.
- Injury timelines.
- Transfer impact notes.
- Form trend charts.
- Goal timing charts.
- Rolling goal projection/xG proxy charts.

## Platform backlog

- Direct URLs/routing.
- User accounts.
- Cloud-synced watchlist.
- Saved research notes.
- Deployment config.
- Server-side API key hardening.
- Background refresh jobs.

---

# Final Target Experience

## Betting Assistant

> Here are the fixtures and markets worth investigating, here is why they are being surfaced, here is what could be wrong, and here is whether the price still works.

## Research Hub

> Here is the evidence room. Search leagues, teams, players, fixtures, and seasons. Compare, inspect, and validate before trusting the Assistant.

If EdgeFinder maintains that split, it will feel coherent, trustworthy, and scalable. More importantly, it will have a real USP: not picks, not stat spam, but explainable betting judgement.