import React from "react";
import ReactDOM from "react-dom/client";
import {
  Activity,
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  Goal,
  ShieldCheck,
  Star,
  Target,
  TrendingUp,
  Trophy
} from "lucide-react";
import { backendProvider } from "./providers/backendProvider";
import { createCachedSportsDataProvider, type CacheEvent } from "./providers/cachedProvider";
import { analyseFixture, formatPercent } from "./model/probability";
import type { Fixture, MarketSelection, TeamSnapshot } from "./types";
import "./styles.css";

const CACHE_TTL_MS = 15 * 60 * 1000;
const FOLLOW_STORAGE_KEY = "edgefinder:follows:v1";

type FixtureFilter = "all" | "following";
type DateFilter = "all" | "today" | "next24" | "weekend";
type AppView = "fixtures" | "stats";

interface FollowState {
  teams: string[];
  leagues: string[];
}

const EMPTY_FOLLOWS: FollowState = {
  teams: [],
  leagues: []
};

interface LeagueSummary {
  name: string;
  fixtureCount: number;
  teamCount: number;
  nextKickoff?: string;
}

interface TeamSummary {
  team: TeamSnapshot;
  league: string;
  fixtureCount: number;
  nextFixture?: Fixture;
}

interface FixtureGroup {
  key: string;
  label: string;
  isPriority: boolean;
  fixtures: Fixture[];
}

function App() {
  const [fixtures, setFixtures] = React.useState<Fixture[]>([]);
  const [selectedFixture, setSelectedFixture] = React.useState<Fixture | undefined>();
  const [selectedId, setSelectedId] = React.useState<string>("");
  const [cacheEvent, setCacheEvent] = React.useState<CacheEvent | undefined>();
  const [fixtureFilter, setFixtureFilter] = React.useState<FixtureFilter>("all");
  const [dateFilter, setDateFilter] = React.useState<DateFilter>("all");
  const [selectedLeague, setSelectedLeague] = React.useState<string>("all");
  const [expandedGroupKeys, setExpandedGroupKeys] = React.useState<Set<string>>(new Set());
  const [appView, setAppView] = React.useState<AppView>("fixtures");
  const [follows, setFollows] = React.useState<FollowState>(() => loadFollows());

  const fixtureProvider = React.useMemo(
    () =>
      createCachedSportsDataProvider(backendProvider, {
        ttlMs: CACHE_TTL_MS,
        onCacheEvent: setCacheEvent
      }),
    []
  );

  const followedTeamIds = React.useMemo(() => new Set(follows.teams), [follows.teams]);
  const followedLeagues = React.useMemo(() => new Set(follows.leagues), [follows.leagues]);
  const followedCount = follows.teams.length + follows.leagues.length;
  const leagueOptions = React.useMemo(
    () => Array.from(new Set(fixtures.map((fixture) => fixture.competition))).sort((first, second) => first.localeCompare(second)),
    [fixtures]
  );

  const visibleFixtures = React.useMemo(() => {
    return fixtures.filter((fixture) => {
      const matchesFollowFilter =
        fixtureFilter === "all" || isFixtureFollowed(fixture, followedTeamIds, followedLeagues);
      const matchesDateFilter = matchesDateWindow(fixture, dateFilter);
      const matchesLeague = selectedLeague === "all" || fixture.competition === selectedLeague;

      return matchesFollowFilter && matchesDateFilter && matchesLeague;
    });
  }, [dateFilter, fixtureFilter, fixtures, followedLeagues, followedTeamIds, selectedLeague]);

  const followedFixtureCount = React.useMemo(
    () => fixtures.filter((fixture) => isFixtureFollowed(fixture, followedTeamIds, followedLeagues)).length,
    [fixtures, followedLeagues, followedTeamIds]
  );
  const visibleFixtureGroups = React.useMemo(() => groupFixturesByDate(visibleFixtures), [visibleFixtures]);
  const leagueSummaries = React.useMemo(() => buildLeagueSummaries(fixtures), [fixtures]);
  const teamSummaries = React.useMemo(() => buildTeamSummaries(fixtures), [fixtures]);

  React.useEffect(() => {
    fixtureProvider.listFixtures().then((items) => {
      setFixtures(items);
      setSelectedId(items[0]?.id ?? "");
    });
  }, [fixtureProvider]);

  React.useEffect(() => {
    if (!selectedId) {
      setSelectedFixture(undefined);
      return;
    }

    let cancelled = false;
    fixtureProvider.getFixture(selectedId).then((fixture) => {
      if (!cancelled) {
        setSelectedFixture(fixture);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fixtureProvider, selectedId]);

  React.useEffect(() => {
    window.localStorage.setItem(FOLLOW_STORAGE_KEY, JSON.stringify(follows));
  }, [follows]);

  React.useEffect(() => {
    if (fixtureFilter === "following" && visibleFixtures.length > 0 && !visibleFixtures.some((item) => item.id === selectedId)) {
      setSelectedId(visibleFixtures[0].id);
    }
  }, [fixtureFilter, selectedId, visibleFixtures]);

  React.useEffect(() => {
    setExpandedGroupKeys((current) => {
      const next = new Set(Array.from(current).filter((key) => visibleFixtureGroups.some((group) => group.key === key)));

      visibleFixtureGroups.forEach((group, index) => {
        if (group.isPriority || index === 0) {
          next.add(group.key);
        }
      });

      return next;
    });
  }, [visibleFixtureGroups]);

  const selected = selectedFixture ?? fixtures.find((fixture) => fixture.id === selectedId);
  const analysis = selected ? analyseFixture(selected) : undefined;
  const selectedIsFollowed = selected ? isFixtureFollowed(selected, followedTeamIds, followedLeagues) : false;

  function toggleTeam(team: TeamSnapshot) {
    setFollows((current) => toggleFollow(current, "teams", team.id));
  }

  function toggleLeague(league: string) {
    setFollows((current) => toggleFollow(current, "leagues", league));
  }

  function toggleFixtureGroup(key: string) {
    setExpandedGroupKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  return (
    <main className="app-shell">
      <aside className="fixture-rail" aria-label="EdgeFinder navigation">
        <div className="brand">
          <Trophy aria-hidden="true" />
          <div>
            <strong>EdgeFinder</strong>
            <span>Football decision desk</span>
          </div>
        </div>

        <section className="watchlist-summary" aria-label="Watchlist">
          <div>
            <span>Following</span>
            <strong>{followedCount}</strong>
          </div>
          <div>
            <span>Tracked fixtures</span>
            <strong>{followedFixtureCount}</strong>
          </div>
        </section>

        <nav className="area-tabs" aria-label="App areas">
          <button
            className={appView === "fixtures" ? "is-active" : ""}
            type="button"
            onClick={() => setAppView("fixtures")}
          >
            <CalendarDays size={15} aria-hidden="true" />
            Fixtures
          </button>
          <button className={appView === "stats" ? "is-active" : ""} type="button" onClick={() => setAppView("stats")}>
            <BarChart3 size={15} aria-hidden="true" />
            Stats
          </button>
        </nav>

        {appView === "fixtures" ? (
          <>
            <div className="filter-tabs" aria-label="Fixture filter">
              <button
                className={fixtureFilter === "all" ? "is-active" : ""}
                type="button"
                onClick={() => setFixtureFilter("all")}
              >
                All
              </button>
              <button
                className={fixtureFilter === "following" ? "is-active" : ""}
                type="button"
                onClick={() => setFixtureFilter("following")}
              >
                Following
              </button>
            </div>

            <div className="quick-filters" aria-label="Date filter">
              <button className={dateFilter === "all" ? "is-active" : ""} type="button" onClick={() => setDateFilter("all")}>
                All dates
              </button>
              <button className={dateFilter === "today" ? "is-active" : ""} type="button" onClick={() => setDateFilter("today")}>
                Today
              </button>
              <button className={dateFilter === "next24" ? "is-active" : ""} type="button" onClick={() => setDateFilter("next24")}>
                <Clock size={14} aria-hidden="true" />
                24h
              </button>
              <button
                className={dateFilter === "weekend" ? "is-active" : ""}
                type="button"
                onClick={() => setDateFilter("weekend")}
              >
                Weekend
              </button>
            </div>

            <div className="league-filter" aria-label="League filter">
              <button
                className={selectedLeague === "all" ? "is-active" : ""}
                type="button"
                onClick={() => setSelectedLeague("all")}
              >
                All leagues
              </button>
              {leagueOptions.map((league) => (
                <button
                  className={selectedLeague === league ? "is-active" : ""}
                  type="button"
                  onClick={() => setSelectedLeague(league)}
                  key={league}
                >
                  {league}
                </button>
              ))}
            </div>

            <div className="rail-section-title">
              <CalendarDays size={16} aria-hidden="true" />
              {fixtureFilter === "following" ? "Followed fixtures" : "Upcoming fixtures"}
            </div>

            <div className="fixture-groups">
              {visibleFixtureGroups.length > 0 ? (
                visibleFixtureGroups.map((group) => (
                  <section className="fixture-day-group" key={group.key}>
                    <button className="fixture-day-toggle" type="button" onClick={() => toggleFixtureGroup(group.key)}>
                      {expandedGroupKeys.has(group.key) ? (
                        <ChevronDown size={15} aria-hidden="true" />
                      ) : (
                        <ChevronRight size={15} aria-hidden="true" />
                      )}
                      <span>{group.label}</span>
                      <small>{group.fixtures.length}</small>
                    </button>
                    {expandedGroupKeys.has(group.key) ? (
                      <div className="fixture-list">
                        {group.fixtures.map((fixture) => (
                          <button
                            className={`fixture-card ${fixture.id === selectedId ? "is-selected" : ""}`}
                            key={fixture.id}
                            type="button"
                            onClick={() => setSelectedId(fixture.id)}
                          >
                            <span>{fixture.competition}</span>
                            <strong>
                              {fixture.home.name} v {fixture.away.name}
                            </strong>
                            <small>{formatKickoffTime(fixture.kickoff)}</small>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </section>
                ))
              ) : (
                <div className="rail-empty">
                  Follow a team or league from any fixture to build this view.
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="rail-section-title">
              <BarChart3 size={16} aria-hidden="true" />
              Stats browser
            </div>
            <div className="stats-rail-card">
              <span>Leagues loaded</span>
              <strong>{leagueSummaries.length}</strong>
            </div>
            <div className="stats-rail-card">
              <span>Teams loaded</span>
              <strong>{teamSummaries.length}</strong>
            </div>
          </>
        )}
      </aside>

      {appView === "stats" ? (
        <StatsWorkspace
          leagueSummaries={leagueSummaries}
          teamSummaries={teamSummaries}
          followedLeagues={followedLeagues}
          followedTeamIds={followedTeamIds}
          onToggleLeague={toggleLeague}
          onToggleTeam={toggleTeam}
        />
      ) : selected && analysis ? (
        <section className="workspace">
          <header className="match-header">
            <div>
              <p>{selected.competition}</p>
              <h1>
                {selected.home.name} <span>vs</span> {selected.away.name}
              </h1>
              <div className="meta-row">
                <span>{selected.venue}</span>
                <span>{new Date(selected.kickoff).toLocaleString("en-GB")}</span>
                <span>Model confidence: {analysis.confidence}</span>
                {cacheEvent ? (
                  <span className="cache-pill">
                    <Database size={14} aria-hidden="true" />
                    {cacheEvent.status === "hit" ? "Loaded from cache" : "Cache refreshed"}
                  </span>
                ) : null}
                {selectedIsFollowed ? <span>In watchlist</span> : null}
              </div>
            </div>
            <div className="edge-summary">
              <span>Best edge</span>
              <strong>{analysis.bestMarket.label}</strong>
              <small>{analysis.bestMarket.note}</small>
            </div>
          </header>

          <section className="follow-panel" aria-label="Follow this fixture">
            <FollowToggle
              label={selected.competition}
              eyebrow="League"
              active={followedLeagues.has(selected.competition)}
              onClick={() => toggleLeague(selected.competition)}
            />
            <FollowToggle
              label={selected.home.name}
              eyebrow="Team"
              active={followedTeamIds.has(selected.home.id)}
              onClick={() => toggleTeam(selected.home)}
            />
            <FollowToggle
              label={selected.away.name}
              eyebrow="Team"
              active={followedTeamIds.has(selected.away.id)}
              onClick={() => toggleTeam(selected.away)}
            />
          </section>

          <section className="score-strip" aria-label="Result probabilities">
            {analysis.resultMarkets.map((market) => (
              <ProbabilityTile selection={market} key={market.label} />
            ))}
          </section>

          <section className="dashboard-grid">
            <Panel title="Team Form" icon={<TrendingUp size={18} />}>
              <TeamForm fixture={selected} />
            </Panel>

            <Panel title="Expected Goals" icon={<Target size={18} />}>
              <div className="xg-grid">
                <Metric label={`${selected.home.name} adjusted xG`} value={analysis.homeExpectedGoals.toFixed(2)} />
                <Metric label={`${selected.away.name} adjusted xG`} value={analysis.awayExpectedGoals.toFixed(2)} />
                <Metric label="Both teams score" value={formatPercent(analysis.bttsProbability)} />
                <Metric label="Over 2.5 goals" value={formatPercent(analysis.over25Probability)} />
              </div>
            </Panel>

            <Panel title="Head To Head" icon={<ShieldCheck size={18} />}>
              <div className="h2h-list">
                {selected.headToHead.map((match) => (
                  <div className="h2h-row" key={`${match.date}-${match.home}-${match.away}`}>
                    <span>{match.date}</span>
                    <strong>
                      {match.home} {match.homeGoals}-{match.awayGoals} {match.away}
                    </strong>
                    <small>xG {match.homeXg.toFixed(1)}-{match.awayXg.toFixed(1)}</small>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Likely Scorelines" icon={<Goal size={18} />}>
              <div className="scoreline-grid">
                {analysis.topScorelines.map((scoreline) => (
                  <div className="scoreline" key={`${scoreline.home}-${scoreline.away}`}>
                    <strong>
                      {scoreline.home}-{scoreline.away}
                    </strong>
                    <span>{formatPercent(scoreline.probability)}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Anytime Scorers" icon={<Activity size={18} />} wide>
              <div className="scorer-table">
                <div className="table-head">
                  <span>Player</span>
                  <span>Team</span>
                  <span>Model</span>
                  <span>Market</span>
                  <span>Edge</span>
                </div>
                {analysis.scorerMarkets.map((market) => (
                  <div className={`table-row ${market.edge > 0 ? "positive" : ""}`} key={market.label}>
                    <span>{market.label}</span>
                    <span>{market.context}</span>
                    <strong>{formatPercent(market.probability)}</strong>
                    <span>{market.marketOdds ? `${market.marketOdds.toFixed(2)}` : "n/a"}</span>
                    <span>{market.edge > 0 ? `+${formatPercent(market.edge)}` : formatPercent(market.edge)}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </section>

          <footer className="note">
            This is a decision-support model, not betting advice. Treat probabilities as estimates, compare them to
            available odds, and only stake money you can afford to lose.
          </footer>
        </section>
      ) : (
        <section className="empty-state">Loading fixtures...</section>
      )}
    </main>
  );
}

function StatsWorkspace({
  leagueSummaries,
  teamSummaries,
  followedLeagues,
  followedTeamIds,
  onToggleLeague,
  onToggleTeam
}: {
  leagueSummaries: LeagueSummary[];
  teamSummaries: TeamSummary[];
  followedLeagues: Set<string>;
  followedTeamIds: Set<string>;
  onToggleLeague: (league: string) => void;
  onToggleTeam: (team: TeamSnapshot) => void;
}) {
  return (
    <section className="workspace stats-workspace">
      <header className="stats-header">
        <div>
          <p>Stats</p>
          <h1>Leagues and teams</h1>
          <div className="meta-row">
            <span>{leagueSummaries.length} leagues</span>
            <span>{teamSummaries.length} teams</span>
            <span>{teamSummaries.filter((item) => followedTeamIds.has(item.team.id)).length} followed teams</span>
          </div>
        </div>
      </header>

      <section className="stats-section" aria-label="Leagues">
        <div className="section-heading">
          <div>
            <p>Browse</p>
            <h2>Leagues</h2>
          </div>
        </div>
        <div className="league-grid">
          {leagueSummaries.map((league) => (
            <article className="league-card" key={league.name}>
              <div>
                <span>League</span>
                <h3>{league.name}</h3>
              </div>
              <dl>
                <div>
                  <dt>Fixtures</dt>
                  <dd>{league.fixtureCount}</dd>
                </div>
                <div>
                  <dt>Teams</dt>
                  <dd>{league.teamCount}</dd>
                </div>
                <div>
                  <dt>Next kickoff</dt>
                  <dd>{league.nextKickoff ? formatDateTime(league.nextKickoff) : "n/a"}</dd>
                </div>
              </dl>
              <FollowButton
                label={league.name}
                active={followedLeagues.has(league.name)}
                onClick={() => onToggleLeague(league.name)}
              />
            </article>
          ))}
        </div>
      </section>

      <section className="stats-section" aria-label="Teams">
        <div className="section-heading">
          <div>
            <p>Inspect</p>
            <h2>Teams</h2>
          </div>
        </div>
        <div className="team-grid">
          {teamSummaries.map(({ team, league, fixtureCount, nextFixture }) => (
            <article className="team-card" key={`${league}-${team.id}`}>
              <header>
                <div>
                  <span>{league}</span>
                  <h3>{team.name}</h3>
                </div>
                <FollowButton
                  label={team.name}
                  active={followedTeamIds.has(team.id)}
                  onClick={() => onToggleTeam(team)}
                />
              </header>
              <div className="team-metrics">
                <Metric label="Attack rating" value={team.attackRating.toFixed(2)} />
                <Metric label="Defence rating" value={team.defenceRating.toFixed(2)} />
                <Metric label="Last 5 xG" value={team.form.xgFor.toFixed(1)} />
                <Metric label="Last 5 xGA" value={team.form.xgAgainst.toFixed(1)} />
              </div>
              <div className="team-card-footer">
                <span>{fixtureCount} upcoming fixture{fixtureCount === 1 ? "" : "s"}</span>
                <strong>
                  {nextFixture
                    ? `${nextFixture.home.name} v ${nextFixture.away.name}, ${formatDateTime(nextFixture.kickoff)}`
                    : "No upcoming fixture loaded"}
                </strong>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function FollowButton({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const actionLabel = `${active ? "Following" : "Follow"} ${label}`;

  return (
    <button
      className={`icon-button ${active ? "is-active" : ""}`}
      type="button"
      onClick={onClick}
      title={active ? `Unfollow ${label}` : `Follow ${label}`}
      aria-label={active ? `Unfollow ${label}` : `Follow ${label}`}
    >
      <Star size={15} fill={active ? "currentColor" : "none"} aria-hidden="true" />
      <span>{actionLabel}</span>
    </button>
  );
}

function FollowToggle({
  label,
  eyebrow,
  active,
  onClick
}: {
  label: string;
  eyebrow: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`follow-toggle ${active ? "is-active" : ""}`} type="button" onClick={onClick}>
      <Star size={18} fill={active ? "currentColor" : "none"} aria-hidden="true" />
      <span>{eyebrow}</span>
      <strong>{label}</strong>
    </button>
  );
}

function ProbabilityTile({ selection }: { selection: MarketSelection }) {
  return (
    <article className={selection.edge > 0 ? "probability-tile positive" : "probability-tile"}>
      <span>{selection.label}</span>
      <strong>{formatPercent(selection.probability)}</strong>
      <small>
        {selection.marketOdds ? `Market ${selection.marketOdds.toFixed(2)} | ` : ""}
        Fair {selection.fairOdds.toFixed(2)}
      </small>
    </article>
  );
}

function Panel({
  title,
  icon,
  children,
  wide = false
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={`panel ${wide ? "wide" : ""}`}>
      <header>
        {icon}
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TeamForm({ fixture }: { fixture: Fixture }) {
  return (
    <div className="form-columns">
      {[fixture.home, fixture.away].map((team) => (
        <div key={team.id}>
          <h3>{team.name}</h3>
          <div className="form-badges">
            {team.form.results.map((result, index) => (
              <span className={`form-badge ${result.toLowerCase()}`} key={`${team.id}-${index}`}>
                {result}
              </span>
            ))}
          </div>
          <dl>
            <div>
              <dt>Last 5 xG</dt>
              <dd>{team.form.xgFor.toFixed(1)}</dd>
            </div>
            <div>
              <dt>Last 5 xGA</dt>
              <dd>{team.form.xgAgainst.toFixed(1)}</dd>
            </div>
            <div>
              <dt>Goals for</dt>
              <dd>{team.form.goalsFor}</dd>
            </div>
            <div>
              <dt>Goals against</dt>
              <dd>{team.form.goalsAgainst}</dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  );
}

function buildLeagueSummaries(fixtures: Fixture[]): LeagueSummary[] {
  const leagues = new Map<string, { fixtures: Fixture[]; teams: Set<string> }>();

  fixtures.forEach((fixture) => {
    const current = leagues.get(fixture.competition) ?? { fixtures: [], teams: new Set<string>() };
    current.fixtures.push(fixture);
    current.teams.add(fixture.home.id);
    current.teams.add(fixture.away.id);
    leagues.set(fixture.competition, current);
  });

  return Array.from(leagues.entries())
    .map(([name, value]) => ({
      name,
      fixtureCount: value.fixtures.length,
      teamCount: value.teams.size,
      nextKickoff: value.fixtures
        .slice()
        .sort((first, second) => new Date(first.kickoff).getTime() - new Date(second.kickoff).getTime())[0]?.kickoff
    }))
    .sort((first, second) => first.name.localeCompare(second.name));
}

function buildTeamSummaries(fixtures: Fixture[]): TeamSummary[] {
  const teams = new Map<string, TeamSummary>();

  fixtures
    .slice()
    .sort((first, second) => new Date(first.kickoff).getTime() - new Date(second.kickoff).getTime())
    .forEach((fixture) => {
      [fixture.home, fixture.away].forEach((team) => {
        const key = `${fixture.competition}:${team.id}`;
        const current = teams.get(key);
        teams.set(key, {
          team,
          league: fixture.competition,
          fixtureCount: (current?.fixtureCount ?? 0) + 1,
          nextFixture: current?.nextFixture ?? fixture
        });
      });
    });

  return Array.from(teams.values()).sort((first, second) => {
    const leagueSort = first.league.localeCompare(second.league);
    return leagueSort !== 0 ? leagueSort : first.team.name.localeCompare(second.team.name);
  });
}

function groupFixturesByDate(fixtures: Fixture[]): FixtureGroup[] {
  const groups = new Map<string, Fixture[]>();

  fixtures
    .slice()
    .sort((first, second) => new Date(first.kickoff).getTime() - new Date(second.kickoff).getTime())
    .forEach((fixture) => {
      const date = new Date(fixture.kickoff);
      const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
      ].join("-");
      groups.set(key, [...(groups.get(key) ?? []), fixture]);
    });

  return Array.from(groups.entries()).map(([key, groupedFixtures]) => ({
    key,
    label: formatFixtureGroupLabel(groupedFixtures[0].kickoff),
    isPriority: isPriorityFixtureGroup(groupedFixtures[0].kickoff),
    fixtures: groupedFixtures
  }));
}

function formatFixtureGroupLabel(value: string) {
  const fixtureDate = new Date(value);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (isSameCalendarDay(fixtureDate, today)) {
    return "Today";
  }

  if (isSameCalendarDay(fixtureDate, tomorrow)) {
    return "Tomorrow";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short"
  }).format(fixtureDate);
}

function formatKickoffTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function isPriorityFixtureGroup(value: string) {
  const fixtureDate = new Date(value);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  return isSameCalendarDay(fixtureDate, today) || isSameCalendarDay(fixtureDate, tomorrow);
}

function matchesDateWindow(fixture: Fixture, filter: DateFilter) {
  const kickoff = new Date(fixture.kickoff);
  const now = new Date();

  if (filter === "all") {
    return true;
  }

  if (filter === "today") {
    return isSameCalendarDay(kickoff, now);
  }

  if (filter === "next24") {
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return kickoff >= now && kickoff <= next24Hours;
  }

  const day = kickoff.getDay();
  return day === 0 || day === 6;
}

function isSameCalendarDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function loadFollows(): FollowState {
  try {
    const rawValue = window.localStorage.getItem(FOLLOW_STORAGE_KEY);
    if (!rawValue) {
      return EMPTY_FOLLOWS;
    }

    const parsedValue = JSON.parse(rawValue) as Partial<FollowState>;
    return {
      teams: Array.isArray(parsedValue.teams) ? parsedValue.teams.filter(Boolean) : [],
      leagues: Array.isArray(parsedValue.leagues) ? parsedValue.leagues.filter(Boolean) : []
    };
  } catch {
    return EMPTY_FOLLOWS;
  }
}

function toggleFollow(state: FollowState, key: keyof FollowState, id: string): FollowState {
  const currentValues = state[key];
  const nextValues = currentValues.includes(id)
    ? currentValues.filter((value) => value !== id)
    : [...currentValues, id];

  return {
    ...state,
    [key]: nextValues
  };
}

function isFixtureFollowed(fixture: Fixture, followedTeams: Set<string>, followedLeagues: Set<string>) {
  return (
    followedLeagues.has(fixture.competition) ||
    followedTeams.has(fixture.home.id) ||
    followedTeams.has(fixture.away.id)
  );
}

export default App;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
