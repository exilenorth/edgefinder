# EdgeFinder Refactoring Plan

Drafted: **2026-04-27**

This document captures the recommended near-term refactoring plan for EdgeFinder as of 2026-04-27.

The goal is not to redesign the app yet. The goal is to reduce future development pain by separating the current large React entry file into clearer app, assistant, research, component, and utility boundaries while preserving existing behaviour.

## Refactoring principle

This refactor should be boring and surgical.

The current app already has useful functionality, but too much of it lives in `src/main.tsx`: app state, navigation, fixture filtering, follows, sidebar UI, Assistant-style fixture analysis, Stats/Research UI, historical fetches, shared UI components, and helper functions.

The essential refactor is:

> Separate structure now so future features do not turn `src/main.tsx` into a maintenance trap.

Do not treat this as a redesign PR. Do not change provider logic, model logic, cache behaviour, or the visual layout beyond necessary naming updates.

---

## Essential scope

## 1. Rename product areas

The product direction is now **Betting Assistant** and **Research Hub**, so the code should stop using the old prototype labels.

Change:

```ts
type AppView = "fixtures" | "stats";
```

To:

```ts
type AppView = "assistant" | "research";
```

Then update app labels:

```txt
Fixtures -> Assistant
Stats -> Research
Stats Centre -> Research Hub
League and team intelligence -> League, team, player, and fixture intelligence
```

This is essential because future components should be named around the product direction, not the old content-type wording.

Acceptance criteria:

- `AppView` uses `assistant | research`.
- Sidebar navigation uses Assistant and Research labels.
- Research heading says Research Hub.
- No provider or model behaviour changes.

---

## 2. Split app bootstrap from app logic

`src/main.tsx` should only mount the app.

Target structure:

```txt
src/main.tsx
src/app/App.tsx
```

`src/main.tsx` should become roughly:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Move the current `App` component into:

```txt
src/app/App.tsx
```

Acceptance criteria:

- `src/main.tsx` only mounts the React app.
- Main app state lives in `src/app/App.tsx`.
- Build still passes.

---

## 3. Extract the sidebar

The sidebar currently owns too much inline UI: brand, watchlist summary, app navigation, fixture filters, fixture groups, and stats summary.

Create:

```txt
src/app/Sidebar.tsx
src/features/assistant/AssistantSidebarContent.tsx
src/features/research/ResearchSidebarContent.tsx
```

`Sidebar` should be a shell. It should receive state and callbacks as props. It should not own business logic.

Essential `Sidebar` props:

```ts
appView
setAppView
followedCount
followedFixtureCount
```

`AssistantSidebarContent` should receive:

```ts
fixtureFilter
dateFilter
selectedLeague
leagueOptions
visibleFixtureGroups
expandedGroupKeys
selectedId
setFixtureFilter
setDateFilter
setSelectedLeague
setSelectedId
toggleFixtureGroup
```

`ResearchSidebarContent` should receive:

```ts
leagueSummaries
teamSummaries
```

Acceptance criteria:

- Sidebar rendering is no longer embedded directly inside `App`.
- Assistant-specific sidebar filters live in `features/assistant`.
- Research-specific sidebar cards live in `features/research`.
- Existing sidebar behaviour remains unchanged.

---

## 4. Extract the two workspaces

Split the main conditional workspace rendering into dedicated feature components.

Create:

```txt
src/features/assistant/BettingAssistantWorkspace.tsx
src/features/research/ResearchHubWorkspace.tsx
```

The Assistant workspace should own the fixture analysis UI:

- match header
- cache/freshness chip currently shown in the meta row
- best edge summary
- follow panel
- probability strip
- team form panel
- expected goals panel
- head-to-head panel
- likely scorelines panel
- anytime scorers panel
- betting responsibility note

The Research workspace should own what is currently `StatsWorkspace`.

Rename:

```txt
StatsWorkspace -> ResearchHubWorkspace
```

Acceptance criteria:

- `App` chooses between `BettingAssistantWorkspace` and `ResearchHubWorkspace`.
- Assistant UI is not embedded directly in `App`.
- Research UI is not embedded directly in `App`.
- No visual redesign is attempted.

---

## 5. Move shared UI primitives

Move reusable component-style functions out of the main app file.

Create:

```txt
src/components/Panel.tsx
src/components/Metric.tsx
src/components/LogoMark.tsx
src/components/FollowToggle.tsx
```

These are shared between Assistant and Research, so they should not live inside a feature file.

Acceptance criteria:

- Shared primitives live in `src/components`.
- Assistant and Research import shared primitives from the same place.
- No duplicated `Panel`, `Metric`, `LogoMark`, or `FollowToggle` implementations.

---

## 6. Move filtering, formatting, and summary helpers

Pure helper functions should leave React component files.

Create:

```txt
src/utils/fixtureFilters.ts
src/utils/formatting.ts
src/utils/follows.ts
src/utils/researchSummaries.ts
```

Likely candidates:

```txt
matchesDateWindow
groupFixturesByDate
formatKickoffTime
formatSeasonLabel
toggleFollow
loadFollows
isFixtureFollowed
buildLeagueSummaries
buildTeamSummaries
```

This will make later testing much easier.

Acceptance criteria:

- Pure helper functions are separated from UI components.
- Helper files have focused names.
- Existing behaviour remains unchanged.

---

## Recommended PR title

```txt
Refactor app shell into Assistant and Research workspaces
```

## Recommended PR acceptance criteria

```txt
- App still builds
- No provider/model behaviour changed
- src/main.tsx only mounts the app
- AppView uses assistant/research
- Sidebar extracted
- Assistant workspace extracted
- Research workspace extracted
- Shared Panel/Metric/LogoMark/FollowToggle moved to components
- Formatting/filter/follow helper functions moved to utils
```

---

## Priority order

Implement in this order:

1. Rename `fixtures/stats` to `assistant/research`.
2. Move `App` to `src/app/App.tsx`.
3. Extract `Sidebar`.
4. Extract `BettingAssistantWorkspace`.
5. Rename/extract `StatsWorkspace` to `ResearchHubWorkspace`.
6. Move shared components.
7. Move helper functions.

This order keeps the refactor small and reduces the risk of breaking behaviour.

---

## Explicit non-goals

Do not introduce React Router yet.

Do not introduce a large global context yet.

Do not build the Edge Dashboard yet.

Do not significantly rewrite CSS yet.

Do not change provider, cache, API, or model logic.

Do not add new product features in this PR.

---

## Why this refactor matters

The next planned features — Edge Dashboard, bet thesis, risk flags, coverage UI, cross-linking, odds movement, and model outputs — will be much easier to build if the current app is split into clear boundaries first.

Without this refactor, every new feature will make `src/main.tsx` harder to reason about.

The aim is simple:

> Make the app easier to extend before making it more sophisticated.
