# EdgeFinder Design Implementation Roadmap

This roadmap explains how to move EdgeFinder from the current fixture-and-stats dashboard into the new two-section product structure:

1. **Betting Assistant** — a fast, opinionated decision-making area for finding and understanding potential betting opportunities.
2. **Research Hub** — a deep, robust evidence area for leagues, teams, players, fixtures, and historical data.

The aim is to make the app feel less like a generic data dashboard and more like a connected betting analysis product: decisions in one area, evidence in the other.

---

## Guiding Principles

### 1. Separate decisions from evidence

The Betting Assistant should help the user decide what to inspect.

The Research Hub should help the user investigate why something might matter.

Do not mix every stat into the Assistant. The Assistant should summarise and prioritise. The Research Hub can be dense and exhaustive.

### 2. Make confidence visible

Every assistant-style recommendation should eventually show:

- Confidence level
- Data freshness
- Key reasons
- Key risks
- Whether data is live, estimated, cached, partial, or unavailable

### 3. Make the two sections connected, not siloed

Users should be able to jump from a fixture or player in the Betting Assistant into the relevant Research Hub page, then return to upcoming analysed fixtures from research pages.

### 4. Build structure before sophistication

The model and data provider depth can improve later. The first goal is to get the product shape right so future functionality has somewhere sensible to live.

---

## Current State

The app currently has the beginnings of this split:

- `AppView = "fixtures" | "stats"`
- Sidebar buttons for `Fixtures` and `Stats`
- Fixture-led analysis in the main workspace
- A stats workspace with league/team browsing, current/historical mode, search, followed-only filtering, and season selection

This is a good foundation, but the terminology and hierarchy are still feature-led rather than outcome-led.

The first major UX change should be to move from:

```txt
Fixtures / Stats
```

to:

```txt
Betting Assistant / Research Hub
```

---

# Phase 1 — Product Language and Navigation

## Goal

Make the app clearly feel like two connected product areas.

## User-facing changes

Rename the top-level sections:

- `Fixtures` → `Assistant` or `Betting Assistant`
- `Stats` → `Research` or `Research Hub`

Recommended sidebar labels:

```txt
Assistant
Research
```

Recommended page-level headings:

```txt
Betting Assistant
Research Hub
```

This keeps the sidebar compact while allowing the main workspace to use clearer full names.

## Code changes

Rename the view type:

```ts
type AppView = "fixtures" | "stats";
```

To:

```ts
type AppView = "assistant" | "research";
```

Then update relevant state and comparisons:

```ts
const [appView, setAppView] = React.useState<AppView>("assistant");
```

Replace conditions like:

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

- The sidebar has clear `Assistant` and `Research` navigation items.
- The app no longer presents the top-level sections as generic fixtures/stats.
- Existing functionality still works exactly as before.
- No model or provider logic is changed.

---

# Phase 2 — Refactor the Main React File

## Goal

Split the current large `src/main.tsx` into smaller feature components so UI changes become safer and easier.

This should happen before major redesign work. The current file is doing too much and will become painful as the app grows.

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
      EdgeSummaryCard.tsx
      ProbabilityTile.tsx
      FollowPanel.tsx
      TeamFormPanel.tsx
      ExpectedGoalsPanel.tsx
      HeadToHeadPanel.tsx
      ScorelinesPanel.tsx
      ScorerMarketsPanel.tsx

    research/
      ResearchHubWorkspace.tsx
      ResearchSidebarContent.tsx
      ResearchToolbar.tsx
      EntityBrowser.tsx
      LeagueDetail.tsx
      TeamDetail.tsx
      HistoricalLeagueDetail.tsx

  components/
    Panel.tsx
    Metric.tsx
    LogoMark.tsx
    EmptyState.tsx
    LoadingState.tsx

  hooks/
    useFollows.ts
    useFixtures.ts
    useFixtureSelection.ts

  utils/
    fixtureFilters.ts
    formatting.ts
```

## Refactor order

1. Move the ReactDOM bootstrap into `src/app/main.tsx`.
2. Move the current `App` component into `src/app/App.tsx`.
3. Extract the sidebar into `Sidebar.tsx`.
4. Extract Assistant-specific content into `features/assistant`.
5. Extract Research-specific content into `features/research`.
6. Move generic UI primitives into `components`.
7. Move filtering/formatting helper functions into `utils`.

## Important constraint

Do this as a behaviour-preserving refactor. The UI should look and behave the same after this phase except for naming changes from Phase 1.

## Acceptance criteria

- `src/main.tsx` becomes small and only mounts the app.
- Assistant and Research code are physically separated.
- Shared UI components are reusable.
- The app builds successfully.
- No visual redesign is attempted in this phase beyond top-level naming.

---

# Phase 3 — Betting Assistant MVP

## Goal

Make the Assistant feel like a decision-support area rather than a plain fixture browser.

## New Assistant layout

Recommended layout:

```txt
Betting Assistant
Football opportunities, confidence, and fixture-level reasoning.

[Assistant summary cards]
- Fixtures loaded
- Followed fixtures
- Potential edges
- Data freshness

[Main content]
Selected fixture analysis
```

## Add an Assistant intro block

At the top of the Assistant workspace, add a short product-framing block:

```txt
Betting Assistant
Find fixtures and markets worth investigating. Use model output as a starting point, then validate the evidence in Research Hub.
```

This can be simple at first. It does not need new model functionality.

## Improve the fixture header

Current fixture analysis leads with match name and a small best-edge card.

Improve hierarchy to:

1. Fixture identity
2. Verdict card
3. Confidence/freshness chips
4. Market probability tiles
5. Evidence panels

Suggested verdict card fields:

```txt
Best opportunity
Market name
Model probability
Market price
Estimated edge
Confidence
Freshness
```

If some values are not yet available, show placeholders like:

```txt
Freshness: awaiting live odds
Confidence: prototype estimate
```

## Add a `Why this edge?` panel

Even before the model is fully improved, reserve space for explanation.

Initial copy can be simple:

```txt
This section will explain the main factors behind the highlighted opportunity, including form, expected goals, market price, and key risks.
```

Later, this can become data-driven.

## Add a `Key risks` panel

This is important for trust.

Initial risk examples:

- Lineups not confirmed
- Odds may be stale
- Model still uses estimated inputs
- Player markets may be unavailable

## Acceptance criteria

- Assistant has a clear product heading.
- The best-edge card feels like the primary decision element.
- There is visible space for explanation and risk context.
- The user understands the Assistant is for finding things to investigate, not blindly placing bets.

---

# Phase 4 — Edge Dashboard

## Goal

Create a scan-first Assistant landing view instead of immediately feeling like a single selected fixture detail page.

## Recommended view

```txt
Edge Dashboard

Top opportunities
------------------------------------------------
Fixture              Market       Edge   Confidence   Kickoff
Arsenal v Chelsea    Over 2.5     +6.2%  Medium       Today 17:30
Villa v Spurs        BTTS Yes     +4.8%  Low          Today 20:00

Filters
Today | 24h | Weekend | Following | League | Market
```

## Implementation approach

Start simple:

- Reuse the existing `fixtures` array.
- Calculate `analyseFixture(fixture)` for each visible fixture.
- Extract `bestMarket` from each analysis.
- Sort by highest positive edge.
- Display a small list above the selected fixture detail.

## Suggested component

```txt
features/assistant/EdgeDashboard.tsx
```

Props:

```ts
interface EdgeDashboardProps {
  fixtures: Fixture[];
  selectedId: string;
  onSelectFixture: (id: string) => void;
}
```

## UX rules

- Do not show too many rows. Start with top 5.
- Make confidence and freshness visible even if simple.
- Clicking an opportunity selects the fixture below.
- If no positive edges exist, show a useful empty state.

## Empty state

```txt
No positive edges found for the current filters.
Try widening the date range or checking back after odds refresh.
```

## Acceptance criteria

- Assistant opens with a scan-first section.
- Fixtures can still be selected from the sidebar.
- Top opportunities are sorted by estimated edge.
- Empty/no-edge states are clear.

---

# Phase 5 — Research Hub MVP

## Goal

Make the current stats area feel like a proper research terminal.

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

## Research Hub navigation

Initial tabs:

```txt
Leagues | Teams | Players
```

Players can be disabled or marked as coming soon at first if data is not ready.

Suggested copy:

```txt
Players coming soon
Player-level research will include minutes, goals, assists, xG/xA, starts likelihood, injuries, and scorer-market relevance.
```

## Research search

Current placeholder:

```txt
Search leagues or teams
```

Recommended future placeholder:

```txt
Search leagues, teams, players, or fixtures
```

If players/fixtures are not ready yet, use:

```txt
Search leagues or teams
```

until they are real.

## Entity-led detail pages

### League Research

Sections:

- Overview
- Table / standings
- Fixture list
- Teams
- Goal trends
- Form trends
- Historical seasons
- Coverage/data availability

### Team Research

Sections:

- Overview
- Form
- Attack
- Defence
- Squad
- Injuries
- Lineups
- Manager
- Stadium
- Transfers
- Upcoming analysed fixtures

### Player Research

Sections for later:

- Overview
- Minutes and starts
- Goals and assists
- xG/xA
- Shots
- Recent form
- Injury/availability
- Scorer-market relevance
- Related fixtures

## Acceptance criteria

- Research Hub is clearly named and framed.
- Leagues and teams remain browsable.
- The structure leaves a clear slot for players.
- Research pages feel like evidence pages, not assistant recommendations.

---

# Phase 6 — Cross-Linking Assistant and Research

## Goal

Make the two product areas work together.

## Assistant to Research links

From Fixture Analysis:

- Home team badge/name → Team Research
- Away team badge/name → Team Research
- League name → League Research
- Player row → Player Research when available
- Evidence panel item → relevant research section

Example links:

```txt
View Arsenal research
View Chelsea research
View Premier League trends
```

## Research to Assistant links

From Team Research:

- Show upcoming fixtures for the team.
- Show whether any fixture has a highlighted opportunity.
- Link back to Fixture Analysis.

From League Research:

- Show upcoming league fixtures.
- Show top opportunities in that league.

From Player Research:

- Show upcoming fixtures involving the player’s team.
- Show scorer markets if available.

## Implementation approach

Introduce lightweight navigation state before adding a full router.

Possible state shape:

```ts
type ResearchEntity =
  | { type: "league"; id: string; name: string }
  | { type: "team"; id: string; name: string }
  | { type: "player"; id: string; name: string };
```

Then add handlers:

```ts
function openResearch(entity: ResearchEntity) {
  setAppView("research");
  setSelectedResearchEntity(entity);
}
```

Later, move to React Router if direct URLs become important.

## Acceptance criteria

- Users can move from Assistant to related research context.
- Users can move from Research back to relevant fixtures.
- Navigation does not feel like two disconnected apps.

---

# Phase 7 — Watchlist and Personalisation

## Goal

Make following teams/leagues feel useful rather than just a filter.

## Current behaviour

The app stores followed teams and leagues in local storage and counts followed/tracked fixtures.

## Improvements

### Assistant Watchlist

Add a Watchlist summary in the Assistant:

```txt
Your Watchlist
3 fixtures today
1 possible edge
2 fixtures awaiting fresh odds
```

### Research Watchlist

In Research Hub, followed entities should be easy to access:

```txt
Followed teams
Followed leagues
Recently viewed
```

### Follow actions

Keep follow buttons in fixture analysis, but make their value clearer:

```txt
Follow this team to track future fixtures and research updates.
```

## Acceptance criteria

- Following a team/league has visible value.
- Watchlist appears in Assistant as a personalised decision feed.
- Research Hub can filter or prioritise followed entities.

---

# Phase 8 — Data Freshness and Trust UI

## Goal

Make the user aware of what is current, stale, estimated, missing, or cached.

## Add freshness chips

Examples:

```txt
Odds refreshed 4m ago
Stats refreshed 2h ago
Lineups not confirmed
Using cached data
Using estimated inputs
```

## Add data quality states

Suggested enum:

```ts
type DataQuality = "live" | "cached" | "estimated" | "partial" | "unavailable";
```

Use this in display components even before the backend/model fully supports it.

## Where to show it

- Assistant verdict card
- Market rows
- Player/scorer rows
- Research detail headers
- Coverage/data availability panels

## Acceptance criteria

- Users can see whether data is trustworthy at a glance.
- Assistant recommendations do not look more certain than they are.
- Research Hub explains coverage gaps clearly.

---

# Phase 9 — Mobile and Responsive Layout

## Goal

Make the two-section design usable on smaller screens.

## Current risk

The app uses a two-column layout with a fixed sidebar. This is fine on desktop but will be cramped on mobile.

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

## Initial CSS breakpoint

Add a basic breakpoint:

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
- Research detail pages stack cleanly.

---

# Phase 10 — Testing and Safety Checks

## Goal

Protect the app as the UI grows.

## Recommended tooling

Add a lightweight testing setup later, for example:

- Vitest
- React Testing Library

## Useful tests

### UI state tests

- Switching between Assistant and Research works.
- Selecting a fixture updates the Assistant detail.
- Following a team persists and affects filters.
- Research search filters teams/leagues.
- Historical mode fetch state handles loading/errors.

### Utility tests

- Date filters work as expected.
- Fixture grouping is stable.
- Follow toggling works.
- Formatting helpers return expected strings.

### Component tests

- Edge summary handles positive, neutral, and missing data states.
- Empty states render correctly.
- Research browser handles no results.

## Acceptance criteria

- Core navigation is covered.
- Follow/filter state is covered.
- Major empty/loading states are covered.

---

# Suggested Delivery Plan

## PR 1 — Product docs

Status: started.

Includes:

- `docs/product-structure.md`
- `docs/implementation-roadmap.md`
- README updates

## PR 2 — Naming and navigation

Includes:

- Rename `fixtures`/`stats` view labels to `assistant`/`research`.
- Update sidebar copy.
- Update page headings.
- No layout refactor yet unless necessary.

## PR 3 — Main file refactor

Includes:

- Split `src/main.tsx` into smaller files.
- Preserve existing behaviour.
- No major redesign.

## PR 4 — Assistant MVP polish

Includes:

- Assistant heading and description.
- Stronger verdict card.
- `Why this edge?` placeholder panel.
- `Key risks` placeholder panel.

## PR 5 — Research Hub MVP polish

Includes:

- Rename Stats Centre to Research Hub.
- Add player tab placeholder.
- Improve research toolbar and empty states.
- Make league/team detail pages feel more entity-led.

## PR 6 — Edge Dashboard

Includes:

- Top opportunities list.
- Sort by best estimated edge.
- Empty state for no opportunities.
- Click row to select fixture.

## PR 7 — Cross-linking

Includes:

- Assistant team/league links into Research.
- Research upcoming fixtures links back to Assistant.
- Lightweight selected research entity state.

## PR 8 — Trust and freshness UI

Includes:

- Freshness chips.
- Data quality labels.
- Coverage warnings.
- Stronger confidence display.

## PR 9 — Responsive layout

Includes:

- Basic mobile/tablet breakpoints.
- Sidebar stacking/collapsing behaviour.
- Research and Assistant stacking improvements.

---

# Backlog Ideas

These should not block the structural redesign, but they are worth keeping in mind.

## Assistant backlog

- Market type filters: 1X2, totals, BTTS, scorer markets.
- Save opportunity to shortlist.
- Add notes to shortlisted opportunities.
- Track result/outcome after fixture completion.
- Compare bookmaker prices.
- Alert when odds move.
- Highlight stale odds.

## Research backlog

- Team comparison view.
- Player comparison view.
- League season comparison.
- Referee data.
- Venue/home-away splits.
- Injury timelines.
- Transfer impact notes.
- Form trend charts.
- Goal timing charts.
- Rolling xG/xGA charts.

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

The end goal is for EdgeFinder to feel like this:

## Betting Assistant

> Here are the fixtures and markets worth investigating, here is why they are being surfaced, here is what could be wrong, and here is how fresh/confident the data is.

## Research Hub

> Here is the evidence room. Search leagues, teams, players, fixtures, and seasons. Compare, inspect, and validate before trusting the Assistant.

If the app consistently maintains that split, it will feel far more coherent, trustworthy, and scalable.
