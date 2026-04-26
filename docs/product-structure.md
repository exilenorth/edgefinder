# EdgeFinder Product Structure

EdgeFinder should be organised around two clear product areas rather than a generic fixtures-and-stats dashboard.

## 1. Betting Assistant

The Betting Assistant is the decision-making area of the app. Its job is to help a user quickly understand what fixtures or markets are worth investigating, why they are being surfaced, and how much confidence they should place in the suggestion.

This area should be fast, opinionated, and prioritised.

### Primary jobs

- Surface the best fixtures and markets to inspect today.
- Explain why a potential edge is being highlighted.
- Show confidence, freshness, and risk warnings clearly.
- Let users filter by date, league, market type, and followed teams.
- Let users save interesting opportunities into a shortlist.

### Suggested views

- **Edge Dashboard**: a scan-first view of today’s strongest opportunities.
- **Fixture Analysis**: the detailed decision page for one fixture.
- **Market Scanner**: a broader market-led view across fixtures.
- **Watchlist**: personalised fixtures and edges from followed teams or leagues.
- **Bet Shortlist**: saved opportunities, notes, and eventual result tracking.

### Fixture Analysis hierarchy

A fixture page should lead with the decision, not the raw data.

Recommended order:

1. Verdict summary
2. Best markets
3. Why this edge?
4. Key risks
5. Odds comparison
6. Team form snapshot
7. Expected goals / scoreline evidence
8. Player/scorer context where available
9. Links into Research Hub

## 2. Research Hub

The Research Hub is the evidence room. Its job is to hold deep, robust data about leagues, teams, players, fixtures, and historical seasons.

This area should be deep, neutral, and searchable.

### Primary jobs

- Let users research leagues, teams, players, fixtures, and historical seasons.
- Make it easy to compare entities.
- Provide the supporting context behind Betting Assistant suggestions.
- Let users move from research back into relevant upcoming fixtures.

### Suggested views

- **League Research**: table, fixtures, form trends, goal trends, market trends, and historical seasons.
- **Team Research**: overview, form, attack, defence, squad, injuries, lineups, transfers, and fixtures.
- **Player Research**: overview, minutes, goals, assists, xG/xA, shots, starts likelihood, and scorer relevance.
- **Fixture Research**: detailed fixture history, head-to-heads, venue, referee, and prior meetings.
- **Compare**: team-vs-team, player-vs-player, and season comparisons.

## Navigation principle

The top-level navigation should use outcome-led labels:

- **Betting Assistant** instead of Fixtures
- **Research Hub** instead of Stats

This makes the product clearer. Fixtures and stats are content types; Assistant and Research describe what the user is trying to do.

## Cross-linking principle

The two areas should be connected, not siloed.

From Betting Assistant:

- Click a team to open Team Research.
- Click a league to open League Research.
- Click a player to open Player Research.
- Click a trend or evidence point to open the relevant research context.

From Research Hub:

- Show upcoming analysed fixtures for the selected team, player, or league.
- Highlight whether any current fixtures have possible edges.
- Allow users to jump back into Fixture Analysis.

## UI tone

The Betting Assistant should feel like:

> Here are the best things to look at, why they matter, and how much to trust them.

The Research Hub should feel like:

> Here is the evidence. Search, filter, compare, and investigate as deeply as you want.
