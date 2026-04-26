# EdgeFinder USP Feature Roadmap Addendum

This addendum extends the existing implementation roadmap with the higher-value product features discussed in the follow-up review: explainable betting intelligence, lineup-adjusted edge detection, odds movement, closing line value, post-match process review, player research, and bet sanity checking.

The original roadmap correctly establishes the two-section structure:

1. **Betting Assistant** — the decision area.
2. **Research Hub** — the evidence area.

This addendum adds the product layer that can make EdgeFinder feel differentiated rather than becoming another generic fixtures/stats dashboard.

---

## Strategic USP

EdgeFinder should not position itself as a simple tips app.

The strongest USP is:

> **An honest betting assistant that explains the edge, the risk, the counterargument, and whether the market has already moved.**

Most betting products either dump stats or shout recommendations. EdgeFinder should sit between those: decision-support with transparent reasoning.

The app should answer four questions for every surfaced opportunity:

1. **What is the potential bet?**
2. **Why might it be value?**
3. **What could make it wrong?**
4. **Is the price still playable?**

That should drive the next set of PRs.

---

# Priority Feature Set

## 1. Bet Thesis Generator

### Product goal

For each highlighted opportunity, show a structured explanation rather than only a score or probability.

### Assistant output

```txt
Bet thesis
- Market: Over 2.5 goals
- Current price: 1.95
- Model fair price: 1.78
- Estimated edge: +4.9 percentage points
- Why this edge exists: both teams profile above league average for attacking output and concede above-average shot volume
- Main risk: lineups not confirmed; away side may rotate after midweek fixture
- Verdict: playable only above 1.85
```

### Required data

API-Football:

- `/fixtures` — fixture identity, teams, kickoff, result/status.
- `/fixtures/statistics` — team match stats for historical attacking/defensive signals.
- `/teams/statistics` — season-level team profile.
- `/fixtures/lineups` — confirmed lineup/formation where available.
- `/injuries` — absence/context risk.
- `/standings` — league/team context.

The Odds API:

- `/v4/sports/{sport}/odds` — bookmaker prices for configured markets.
- `/v4/sports/{sport}/events/{eventId}/odds` — detail refresh for a selected fixture.

### Integration notes

Create a domain object rather than scattering copy around React components:

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

Initial version can use deterministic rules. Do not wait for a perfect model.

---

## 2. Counterargument / Risk Engine

### Product goal

Every suggested edge should include reasons not to trust it. This is a major trust differentiator.

### Example risks

- Lineups not confirmed.
- Odds are stale.
- Market has already moved below fair price.
- Injury data is partial or unavailable.
- Model uses estimated inputs.
- Recent form sample is too small.
- Team statistics coverage is unavailable for this league/season.

### Required data

API-Football:

- `/leagues` — coverage flags by league/season.
- `/fixtures/lineups` — lineup confirmation.
- `/injuries` — player availability.
- `/fixtures` — fixture status/date.

The Odds API:

- odds response `last_update` fields at bookmaker/market level.

### Integration notes

Add a reusable risk builder:

```txt
server/analysis/riskEngine.ts
```

Potential function:

```ts
function buildRiskFlags(input: RiskInput): RiskFlag[]
```

Assistant components should render risk flags consistently in:

- Verdict card.
- `Key risks` panel.
- Opportunity rows.

---

## 3. Lineup-Adjusted Edge Detection

### Product goal

Recalculate confidence and potentially fair prices once confirmed lineups are available.

This can become one of EdgeFinder's clearest USPs:

> **The app re-checks the edge when lineups drop.**

### Required data

API-Football:

- `/fixtures/lineups` — formation and starting XI.
- `/players` — player season stats, minutes, goals, assists, appearance history.
- `/fixtures/players` — historical player match stats where available.
- `/injuries` — known absences.

The Odds API:

- `/v4/sports/{sport}/events/{eventId}/odds` — refresh selected fixture odds after lineups.

### Integration notes

Start with a simple lineup confidence layer before trying to price individual player impact precisely.

Initial rules:

- If lineups unavailable: `lineupStatus = "unconfirmed"`.
- If lineup available and expected starters missing: downgrade confidence.
- If key attacking players start: upgrade scorer/goal-market confidence.
- If defensive starters missing: upgrade opponent goals/BTTS/overs confidence.

Suggested new model object:

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

---

## 4. Odds Movement and Edge Decay Tracker

### Product goal

Show whether a previously identified opportunity is still playable.

### Assistant output

```txt
Edge status
- Found at: 2.10
- Current: 1.86
- Fair price: 1.91
- Status: edge gone
```

### Required data

The Odds API:

- `/v4/sports/{sport}/odds` — recurring market snapshots.
- `/v4/sports/{sport}/events/{eventId}/odds` — selected event refresh.
- bookmaker/market `last_update` fields.

Internal database:

- `odds_events`
- `odds_snapshots`
- `opportunities`
- `opportunity_snapshots`

### Integration notes

Do not overwrite odds. Store snapshots.

Suggested tables:

```sql
CREATE TABLE opportunities (
  id TEXT PRIMARY KEY,
  fixture_id TEXT NOT NULL,
  market_key TEXT NOT NULL,
  selection TEXT NOT NULL,
  first_seen_at INTEGER NOT NULL,
  first_price REAL,
  first_edge REAL,
  status TEXT NOT NULL
);

CREATE TABLE opportunity_snapshots (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL,
  price REAL,
  fair_price REAL,
  edge REAL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

Assistant UI should show:

- `New edge`
- `Still playable`
- `Price moved against us`
- `Edge gone`
- `Improved price`

---

## 5. Closing Line Value Tracker

### Product goal

Track whether EdgeFinder beats the closing market, not just whether the bet won.

This is vital if the app wants to teach good process rather than outcome-chasing.

### Required data

The Odds API:

- odds snapshots close to kickoff.
- final pre-kickoff odds where available from repeated polling.
- historical odds if plan supports it.

API-Football:

- `/fixtures` — kickoff time and final result/status.

Internal database:

- odds snapshots.
- shortlisted/saved opportunities.
- final result state.

### Integration notes

Add CLV only after odds snapshots exist.

Suggested derived fields:

```txt
selected_price
closing_price
closing_line_value_percent
beat_closing_line: true/false
result: won/lost/push/void/unknown
```

Assistant and history views should separate:

- **Process result** — did the price beat close?
- **Bet result** — did it win?

---

## 6. Post-Match Process Review

### Product goal

After a fixture finishes, explain whether the original reasoning was good, lucky, unlucky, or wrong.

### Example output

```txt
Result: Lost
Process review: Reasonable bet. The selection lost, but the underlying match stats supported the thesis: shot volume, territory and chances were all in line with the model. No major model downgrade suggested.
```

### Required data

API-Football:

- `/fixtures` — final score/status.
- `/fixtures/statistics` — match-level team stats.
- `/fixtures/players` — player performance stats.
- `/fixtures/events` — red cards, penalties, substitutions, goal timing.
- `/fixtures/lineups` — confirmed teams.

The Odds API:

- closing odds snapshot from stored data.

### Integration notes

Create a `postMatchReviewService` later. Start rule-based.

Review dimensions:

- Did the closing line move in favour of the recommendation?
- Did match stats support the thesis?
- Were there major events that distorted the result?
- Did missing/rotated players invalidate the pre-match assumption?

---

## 7. Bet Builder / Acca Sanity Checker

### Product goal

Let users paste or manually create a bet/acca/bet builder and get a warning before placing it.

This is a strong casual-user feature and good for shareable content.

### MVP scope

Manual entry only:

```txt
Selection
Market
Odds
Fixture
```

Output:

- implied probability
- estimated fair probability if model supports the market
- weakest leg
- correlation warning
- price warning
- suggested removal or safer alternative

### Required data

API-Football:

- fixture/team/player context depending on selected leg.
- `/fixtures/statistics`
- `/teams/statistics`
- `/players`
- `/fixtures/players`
- `/injuries`

The Odds API:

- market prices where supported.

### Integration notes

This should not block the core Assistant. Treat as a later Assistant mode:

```txt
features/assistant/sanity-checker/
```

Initial checker can handle:

- 1X2
- totals
- BTTS if model exists
- simple multiple-leg probability multiplication
- obvious correlation warnings

---

## 8. Player Prop Research Assistant

### Product goal

Use player statistics to surface player-level research angles, even if odds coverage for player props is limited at first.

### Required data

API-Football:

- `/players` — season-level player stats.
- `/fixtures/players` — per-match player stats.
- `/fixtures/lineups` — starts/formation.
- `/injuries` — availability.
- `/players/topscorers`
- `/players/topassists`

The Odds API:

- only if player prop markets are available on the plan/sport.

### Integration notes

Start in Research Hub, not Assistant.

Recommended first player research metrics:

- minutes per appearance
- start rate
- goals per 90
- assists per 90
- shots per match if available from fixture/player stats
- shots on target per match if available
- cards/fouls/tackles if available
- injury/availability status

Once stable, promote selected player angles into Assistant.

---

# API Endpoint Map

## API-Football endpoints to use

| Endpoint | Use in EdgeFinder | First PR target |
|---|---|---|
| `/leagues` | League metadata and coverage flags | PR 8 / data trust |
| `/fixtures` | Fixtures, results, status, venue, teams | Existing / DB PR |
| `/fixtures/headtohead` | H2H context | Existing / Research polish |
| `/fixtures/statistics` | Team match stats, post-match review, goal model inputs | Data/model PR |
| `/fixtures/players` | Player match stats, prop research, post-match review | Research player PR |
| `/fixtures/events` | Goals/cards/subs/VAR timeline and match distortion context | Post-match PR |
| `/fixtures/lineups` | Confirmed XI, formation, lineup-adjusted edge detection | Lineup PR |
| `/teams` | Team profile and venue | Existing / DB PR |
| `/teams/statistics` | Team season profile, attack/defence indicators | Research/model PR |
| `/players/squads` | Squad list | Research team PR |
| `/players` | Player season stats and profiles | Player research PR |
| `/players/topscorers` | League/player research | Existing / Research polish |
| `/players/topassists` | League/player research | Existing / Research polish |
| `/injuries` | Availability/risk flags | Risk/lineup PR |
| `/standings` | League table and context | Existing / Research polish |
| `/transfers` | Squad churn/context | Research team PR |
| `/predictions` | Optional external second opinion, not core model | Later validation PR |

## The Odds API endpoints to use

| Endpoint | Use in EdgeFinder | First PR target |
|---|---|---|
| `/v4/sports` | Validate available sports/keys | Provider debug PR |
| `/v4/sports/{sport}/events` | Event list for matching | Odds matching PR |
| `/v4/sports/{sport}/odds` | Main bookmaker odds feed | Existing / odds snapshots PR |
| `/v4/sports/{sport}/events/{eventId}/odds` | Fixture detail odds refresh | Assistant detail PR |
| Historical odds endpoints, if plan supports | CLV backfill and review | Later CLV PR |

---

# Integration Into Current Planned PRs

## PR 1 — Product docs

Status: current PR.

Add this document to capture the USP layer.

Also update `docs/product-structure.md` later with one sentence under Betting Assistant:

```txt
The Assistant should explain both the case for and against each opportunity, including price movement and data freshness.
```

## PR 2 — Naming and navigation

Keep this narrow.

Do not add USP features yet. Only make sure the top-level IA supports them:

- `Assistant`
- `Research`
- clear page titles
- no provider/model behaviour changes

## PR 3 — Main file refactor

Add folder slots for future USP features even if empty:

```txt
features/assistant/
  thesis/
  risk/
  dashboard/
  sanity-checker/

features/research/
  players/
  fixtures/
  coverage/
```

Do not build the features in this PR. Just avoid a structure that makes them awkward later.

## PR 4 — Assistant MVP polish

Add the first visible USP placeholders:

- `BetThesisPanel`
- `CounterargumentPanel`
- `RiskFlagsPanel`
- `DataFreshnessChips`

Initial data can be static/rule-based.

Acceptance criteria should include:

- Every highlighted opportunity has at least one reason and one risk.
- The UI avoids implying false certainty.
- Estimated/model-placeholder inputs are labelled clearly.

## PR 5 — Research Hub MVP polish

Add the Research slots needed for model evidence:

- Team attack section.
- Team defence section.
- Injuries section.
- Lineups section.
- Player tab placeholder.
- Coverage/data availability section.

Also expose provider coverage from `/leagues` so the app can say when fixture stats/player stats/lineups/injuries are unavailable.

## PR 6 — Edge Dashboard

Upgrade from plain best-edge sorting to an opportunity model:

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

This becomes the bridge to odds movement and CLV later.

## PR 7 — Cross-linking

Make thesis/risk items link into Research Hub.

Examples:

- `Lineups not confirmed` → Fixture Research / Lineups.
- `Away defence allowing high shot volume` → Away Team Research / Defence.
- `Market moved against this price` → Fixture Research / Odds Movement.
- `Key forward injured` → Team Research / Injuries.

## PR 8 — Trust and freshness UI

Expand this PR into the first serious data-trust milestone.

Add:

- provider coverage panel.
- odds last-updated chips.
- lineup status chip.
- injuries freshness chip.
- estimated-input warnings.
- partial/unavailable provider states.

Use the data quality enum across Assistant and Research.

## PR 9 — Responsive layout

Make sure the Assistant's opportunity cards and thesis/risk panels stack cleanly on mobile.

Mobile order should be:

1. Verdict.
2. Price/edge.
3. Reasons.
4. Risks.
5. Actions.
6. Evidence links.

## New PR 10 — Database schema and provider sync

This should happen before serious modelling.

Add tables for:

- provider requests.
- leagues.
- league seasons/coverage.
- teams.
- venues.
- fixtures.
- fixture statistics.
- team statistics.
- players.
- player season statistics.
- injuries.
- lineups.
- odds events.
- odds snapshots.

This PR turns EdgeFinder from a live API wrapper into a product with memory.

## New PR 11 — Goal Projection Model MVP

Build a pragmatic fixture-level goal model, not true shot-based xG.

Inputs:

- historical goals.
- fixture statistics.
- team season statistics.
- home/away split.
- injuries/lineups later.
- market odds optionally as calibration signal.

Outputs:

- home expected goals.
- away expected goals.
- 1X2 probabilities.
- totals probabilities.
- BTTS probability when implemented.
- fair odds.

Do not claim true xG unless shot-location data is added from another provider.

## New PR 12 — Odds Movement and Edge Decay

Requires odds snapshots.

Add:

- edge first seen.
- current price.
- best available price.
- fair price.
- edge status.
- odds movement timeline.

## New PR 13 — Lineup-Adjusted Recheck

Requires lineups, players, injuries and odds refresh.

Add:

- lineup status.
- missing starter flags.
- formation change notes.
- confidence adjustment.
- rechecked-after-lineups timestamp.

## New PR 14 — Closing Line Value and Bet History

Requires odds snapshots and saved/shortlisted opportunities.

Add:

- saved opportunity history.
- price taken.
- closing price.
- CLV.
- result.
- process result separate from win/loss result.

## New PR 15 — Post-Match Process Review

Requires final fixture stats and saved opportunity history.

Add:

- final score.
- match stats summary.
- event context.
- thesis review.
- lucky/unlucky/process-good/process-bad label.

## New PR 16 — Bet Builder / Acca Sanity Checker

Treat this as a separate Assistant mode after the core opportunity engine is stable.

MVP:

- manual selection entry.
- implied probability.
- fair probability where model supports it.
- weakest leg.
- correlation warnings.
- safer alternative suggestion.

---

# Recommended Build Order

The clean order is:

1. **Finish PR 1 docs.**
2. **Ship navigation rename and refactor.**
3. **Create the Assistant thesis/risk UI placeholders.**
4. **Create Research coverage/team/player slots.**
5. **Add database schema and provider sync.**
6. **Store odds snapshots.**
7. **Build fixture-level goal projection MVP.**
8. **Wire model output into Edge Dashboard.**
9. **Add odds movement and edge decay.**
10. **Add lineup recheck.**
11. **Add CLV.**
12. **Add post-match review.**
13. **Add bet builder/acca sanity checker.**

This keeps the product honest. The UI will promise the right things early, but the deeper intelligence only becomes authoritative once the data layer and model layer are ready.

---

# Important Product Warnings

## Do not overclaim xG

API-Football appears suitable for fixture-level expected goals projections, but not true shot-location xG unless shot-level coordinates are confirmed or another provider is added.

Use names like:

- Goal Projection Model.
- Expected Goals Forecast.
- EdgeFinder Goal Model.

Avoid:

- true xG model.
- shot-based xG.
- proprietary xG from shot locations.

Unless the data genuinely supports it.

## Do not hide uncertainty

A betting app that always sounds confident will feel dodgy.

EdgeFinder should explicitly show:

- estimated inputs.
- stale odds.
- missing lineups.
- missing injury data.
- incomplete coverage.
- model disagreement.

That honesty is part of the USP.

## Do not build another tips app

The user should feel EdgeFinder is helping them think, not telling them what to do.

The app's tone should be:

> Here is the possible edge. Here is the evidence. Here is the risk. Here is whether the price still works.

That is the product.