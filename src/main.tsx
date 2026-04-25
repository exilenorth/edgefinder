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
  Search,
  ShieldCheck,
  Star,
  Target,
  TrendingUp,
  Trophy
} from "lucide-react";
import { backendProvider } from "./providers/backendProvider";
import { createCachedSportsDataProvider, type CacheEvent } from "./providers/cachedProvider";
import { analyseFixture, formatPercent } from "./model/probability";
import type { Fixture, MarketSelection, TeamDossier, TeamSnapshot } from "./types";
import { findClubProfile, getClubCrestUrl, getLeagueLogoUrl } from "./data/eplClubProfiles";
import { apiConfig } from "./config/apiConfig";
import "./styles.css";

const CACHE_TTL_MS = 15 * 60 * 1000;
const FOLLOW_STORAGE_KEY = "edgefinder:follows:v1";
const DEFAULT_STATS_SEASON = apiConfig.apiFootballSeason;
const STATS_SEASON_OPTIONS = Array.from({ length: 4 }, (_, index) => DEFAULT_STATS_SEASON - index);

type FixtureFilter = "all" | "following";
type DateFilter = "all" | "today" | "next24" | "weekend";
type AppView = "fixtures" | "stats";
type StatsTab = "leagues" | "teams";
type TeamInsightTab = "overview" | "squad" | "lineups" | "manager" | "stadium" | "fixtures";

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
  logoUrl?: string;
  fixtureCount: number;
  teamCount: number;
  nextKickoff?: string;
  fixtures: Fixture[];
}

interface TeamSummary {
  team: TeamSnapshot;
  league: string;
  fixtureCount: number;
  nextFixture?: Fixture;
  fixtures: Fixture[];
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
                            <strong className="fixture-teams">
                              <LogoMark src={getTeamLogoUrl(fixture.home)} label={fixture.home.name} size="small" />
                              {fixture.home.name} v {fixture.away.name}
                              <LogoMark src={getTeamLogoUrl(fixture.away)} label={fixture.away.name} size="small" />
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
                <LogoMark src={getTeamLogoUrl(selected.home)} label={selected.home.name} />
                {selected.home.name} <span>vs</span> {selected.away.name}
                <LogoMark src={getTeamLogoUrl(selected.away)} label={selected.away.name} />
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
  const [statsTab, setStatsTab] = React.useState<StatsTab>("leagues");
  const [query, setQuery] = React.useState("");
  const [followedOnly, setFollowedOnly] = React.useState(false);
  const [selectedSeason, setSelectedSeason] = React.useState(DEFAULT_STATS_SEASON);
  const [selectedLeagueName, setSelectedLeagueName] = React.useState(leagueSummaries[0]?.name ?? "");
  const [selectedTeamKey, setSelectedTeamKey] = React.useState(
    teamSummaries[0] ? getTeamSummaryKey(teamSummaries[0]) : ""
  );

  const normalizedQuery = query.trim().toLowerCase();
  const filteredLeagues = leagueSummaries.filter((league) => {
    const matchesQuery = !normalizedQuery || league.name.toLowerCase().includes(normalizedQuery);
    const matchesFollowed = !followedOnly || followedLeagues.has(league.name);
    return matchesQuery && matchesFollowed;
  });
  const filteredTeams = teamSummaries.filter(({ team, league }) => {
    const matchesQuery =
      !normalizedQuery ||
      team.name.toLowerCase().includes(normalizedQuery) ||
      league.toLowerCase().includes(normalizedQuery);
    const matchesFollowed = !followedOnly || followedTeamIds.has(team.id);
    return matchesQuery && matchesFollowed;
  });
  const selectedLeague =
    leagueSummaries.find((league) => league.name === selectedLeagueName) ?? filteredLeagues[0] ?? leagueSummaries[0];
  const selectedTeam =
    teamSummaries.find((team) => getTeamSummaryKey(team) === selectedTeamKey) ?? filteredTeams[0] ?? teamSummaries[0];

  React.useEffect(() => {
    if (!selectedLeagueName && leagueSummaries[0]) {
      setSelectedLeagueName(leagueSummaries[0].name);
    }
  }, [leagueSummaries, selectedLeagueName]);

  React.useEffect(() => {
    if (!selectedTeamKey && teamSummaries[0]) {
      setSelectedTeamKey(getTeamSummaryKey(teamSummaries[0]));
    }
  }, [selectedTeamKey, teamSummaries]);

  return (
    <section className="workspace stats-workspace">
      <header className="stats-header">
        <div>
          <p>Stats Centre</p>
          <h1>League and team intelligence</h1>
          <div className="meta-row">
            <span>{leagueSummaries.length} leagues</span>
            <span>{teamSummaries.length} teams</span>
            <span>{teamSummaries.filter((item) => followedTeamIds.has(item.team.id)).length} followed teams</span>
          </div>
        </div>
      </header>

      <section className="stats-toolbar" aria-label="Stats filters">
        <label className="stats-search">
          <Search size={17} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search leagues or teams"
            type="search"
          />
        </label>
        <button
          className={`stats-toggle ${followedOnly ? "is-active" : ""}`}
          type="button"
          onClick={() => setFollowedOnly((current) => !current)}
        >
          <Star size={16} fill={followedOnly ? "currentColor" : "none"} aria-hidden="true" />
          Followed only
        </button>
        <label className="season-select">
          <span>Season</span>
          <select value={selectedSeason} onChange={(event) => setSelectedSeason(Number(event.target.value))}>
            {STATS_SEASON_OPTIONS.map((season) => (
              <option value={season} key={season}>
                {formatSeasonLabel(season)}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="stats-centre">
        <aside className="stats-browser" aria-label="Stats browser">
          <div className="stats-tabs">
            <button
              className={statsTab === "leagues" ? "is-active" : ""}
              type="button"
              onClick={() => setStatsTab("leagues")}
            >
              Leagues
            </button>
            <button
              className={statsTab === "teams" ? "is-active" : ""}
              type="button"
              onClick={() => setStatsTab("teams")}
            >
              Teams
            </button>
          </div>

          {statsTab === "leagues" ? (
            <div className="stats-browser-list">
              {filteredLeagues.map((league) => (
                <button
                  className={`stats-browser-item ${selectedLeague?.name === league.name ? "is-selected" : ""}`}
                  type="button"
                  key={league.name}
                  onClick={() => setSelectedLeagueName(league.name)}
                >
                  <span className="browser-title">
                    <LogoMark src={league.logoUrl ?? getLeagueLogoUrl(league.name)} label={league.name} size="small" />
                    {league.name}
                  </span>
                  <strong>{league.fixtureCount} fixtures</strong>
                  <small>{league.teamCount} teams</small>
                </button>
              ))}
            </div>
          ) : (
            <div className="stats-browser-list">
              {filteredTeams.map((teamSummary) => (
                <button
                  className={`stats-browser-item ${
                    selectedTeam && getTeamSummaryKey(selectedTeam) === getTeamSummaryKey(teamSummary) ? "is-selected" : ""
                  }`}
                  type="button"
                  key={getTeamSummaryKey(teamSummary)}
                  onClick={() => setSelectedTeamKey(getTeamSummaryKey(teamSummary))}
                >
                  <span className="browser-title">
                    <LogoMark src={getTeamLogoUrl(teamSummary.team)} label={teamSummary.team.name} size="small" />
                    {teamSummary.team.name}
                  </span>
                  <strong>{teamSummary.league}</strong>
                  <small>{teamSummary.fixtureCount} fixtures</small>
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className="stats-detail">
          {statsTab === "leagues" && selectedLeague ? (
            <LeagueDetail
              league={selectedLeague}
              teamSummaries={teamSummaries.filter((team) => team.league === selectedLeague.name)}
              followed={followedLeagues.has(selectedLeague.name)}
              onToggleFollow={() => onToggleLeague(selectedLeague.name)}
              onSelectTeam={(team) => {
                setStatsTab("teams");
                setSelectedTeamKey(getTeamSummaryKey(team));
              }}
            />
          ) : selectedTeam ? (
            <TeamDetail
              summary={selectedTeam}
              followed={followedTeamIds.has(selectedTeam.team.id)}
              selectedSeason={selectedSeason}
              onToggleFollow={() => onToggleTeam(selectedTeam.team)}
            />
          ) : (
            <div className="stats-empty">No matching stats loaded.</div>
          )}
        </div>
      </section>
    </section>
  );
}

function LeagueDetail({
  league,
  teamSummaries,
  followed,
  onToggleFollow,
  onSelectTeam
}: {
  league: LeagueSummary;
  teamSummaries: TeamSummary[];
  followed: boolean;
  onToggleFollow: () => void;
  onSelectTeam: (team: TeamSummary) => void;
}) {
  const attackRankings = teamSummaries.slice().sort((first, second) => second.team.attackRating - first.team.attackRating);
  const defenceRankings = teamSummaries.slice().sort((first, second) => first.team.defenceRating - second.team.defenceRating);

  return (
    <>
      <header className="detail-header">
        <div className="entity-heading">
          <LogoMark src={league.logoUrl ?? getLeagueLogoUrl(league.name)} label={league.name} size="large" />
          <div>
            <p>League</p>
            <h2>{league.name}</h2>
          </div>
        </div>
        <FollowButton label={league.name} active={followed} onClick={onToggleFollow} />
      </header>

      <section className="detail-metrics" aria-label={`${league.name} overview`}>
        <Metric label="Fixtures loaded" value={String(league.fixtureCount)} />
        <Metric label="Teams loaded" value={String(league.teamCount)} />
        <Metric label="Next kickoff" value={league.nextKickoff ? formatDateTime(league.nextKickoff) : "n/a"} />
        <Metric label="Follow status" value={followed ? "Following" : "Open"} />
      </section>

      <section className="detail-grid">
        <Panel title="Attack Rankings" icon={<TrendingUp size={18} />}>
          <div className="ranking-list">
            {attackRankings.slice(0, 8).map((team, index) => (
              <button className="ranking-row" type="button" key={getTeamSummaryKey(team)} onClick={() => onSelectTeam(team)}>
                <span>{index + 1}</span>
                <strong className="ranking-team">
                  <LogoMark src={getTeamLogoUrl(team.team)} label={team.team.name} size="small" />
                  {team.team.name}
                </strong>
                <small>{team.team.attackRating.toFixed(2)}</small>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Defence Rankings" icon={<ShieldCheck size={18} />}>
          <div className="ranking-list">
            {defenceRankings.slice(0, 8).map((team, index) => (
              <button className="ranking-row" type="button" key={getTeamSummaryKey(team)} onClick={() => onSelectTeam(team)}>
                <span>{index + 1}</span>
                <strong className="ranking-team">
                  <LogoMark src={getTeamLogoUrl(team.team)} label={team.team.name} size="small" />
                  {team.team.name}
                </strong>
                <small>{team.team.defenceRating.toFixed(2)}</small>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Upcoming Fixtures" icon={<CalendarDays size={18} />} wide>
          <div className="detail-fixture-list">
            {league.fixtures.slice(0, 10).map((fixture) => (
              <div className="detail-fixture-row" key={fixture.id}>
                <span>{formatDateTime(fixture.kickoff)}</span>
                <strong>
                  {fixture.home.name} v {fixture.away.name}
                </strong>
                <small>{fixture.venue}</small>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </>
  );
}

function TeamDetail({
  summary,
  followed,
  selectedSeason,
  onToggleFollow
}: {
  summary: TeamSummary;
  followed: boolean;
  selectedSeason: number;
  onToggleFollow: () => void;
}) {
  const { team, league, fixtureCount, nextFixture } = summary;
  const [activeTab, setActiveTab] = React.useState<TeamInsightTab>("overview");
  const [dossier, setDossier] = React.useState<TeamDossier | undefined>();
  const [dossierLoading, setDossierLoading] = React.useState(false);
  const probableFormation = estimateFormation(team.players);
  const clubProfile = findClubProfile(team.id, team.name);
  const apiTeamId = getApiFootballTeamId(team, clubProfile);
  const crestUrl = getTeamLogoUrl(team);
  const squadPlayers = dossier?.squad.length ? dossier.squad : undefined;
  const likelyStarters = team.players.filter((player) => player.startsLikely);
  const positionCounts = getPositionCountsFromDossier(squadPlayers) ?? getPositionCounts(team.players);
  const stadiumImageUrl = dossier?.venue?.image ?? getStadiumImageUrl(summary);

  React.useEffect(() => {
    if (!apiTeamId) {
      setDossier(undefined);
      return;
    }

    let cancelled = false;
    setDossierLoading(true);
    const params = new URLSearchParams({
      name: team.name,
      season: String(selectedSeason)
    });

    fetch(`/api/teams/${apiTeamId}/dossier?${params.toString()}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Team dossier request failed: ${response.status}`);
        return response.json() as Promise<TeamDossier>;
      })
      .then((nextDossier) => {
        if (!cancelled) setDossier(nextDossier);
      })
      .catch((error) => {
        console.warn("Team dossier request failed", error);
        if (!cancelled) setDossier(undefined);
      })
      .finally(() => {
        if (!cancelled) setDossierLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiTeamId, selectedSeason, team.name]);

  return (
    <>
      <header className="detail-header">
        <div className="entity-heading">
          <LogoMark src={crestUrl} label={team.name} size="large" />
          <div>
            <p>{league}</p>
            <h2>{team.name}</h2>
            <span className="season-chip">Viewing {formatSeasonLabel(selectedSeason)}</span>
          </div>
        </div>
        <FollowButton label={team.name} active={followed} onClick={onToggleFollow} />
      </header>

      <nav className="detail-tabs" aria-label={`${team.name} detail sections`}>
        {[
          ["overview", "Overview"],
          ["squad", "Squad"],
          ["lineups", "Lineups"],
          ["manager", "Manager"],
          ["stadium", "Stadium"],
          ["fixtures", "Fixtures"]
        ].map(([id, label]) => (
          <button
            className={activeTab === id ? "is-active" : ""}
            type="button"
            onClick={() => setActiveTab(id as TeamInsightTab)}
            key={id}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <>
          <section className="detail-metrics" aria-label={`${team.name} overview`}>
            <Metric label="Attack rating" value={team.attackRating.toFixed(2)} />
            <Metric label="Defence rating" value={team.defenceRating.toFixed(2)} />
            <Metric label="Upcoming fixtures" value={String(fixtureCount)} />
            <Metric label="Follow status" value={followed ? "Following" : "Open"} />
          </section>

          <section className="detail-grid">
            <Panel title="Club Profile" icon={<Trophy size={18} />}>
              {clubProfile ? (
                <div className="club-profile-card">
                  <div className="club-profile-identity">
                    <LogoMark src={crestUrl} label={team.name} size="large" />
                    <strong>{team.name}</strong>
                  </div>
                  <div>
                    <span>Founded</span>
                    <strong>{clubProfile.founded ?? "Unknown"}</strong>
                  </div>
                  <div>
                    <span>Nickname</span>
                    <strong>{clubProfile.nickname ?? "Unknown"}</strong>
                  </div>
                  <div>
                    <span>Colours</span>
                    <strong>{clubProfile.colours ?? "Unknown"}</strong>
                  </div>
                  <small>Curated profile, verified {clubProfile.lastVerified}</small>
                </div>
              ) : (
                <div className="stats-empty">No curated club profile available yet.</div>
              )}
            </Panel>

            <Panel title="Form Profile" icon={<TrendingUp size={18} />}>
              <div>
                <div className="form-badges">
                  {team.form.results.map((result, index) => (
                    <span className={`form-badge ${result.toLowerCase()}`} key={`${team.id}-detail-${index}`}>
                      {result}
                    </span>
                  ))}
                </div>
                <dl>
                  <div>
                    <dt>Goals for</dt>
                    <dd>{team.form.goalsFor}</dd>
                  </div>
                  <div>
                    <dt>Goals against</dt>
                    <dd>{team.form.goalsAgainst}</dd>
                  </div>
                  <div>
                    <dt>Last 5 xG</dt>
                    <dd>{team.form.xgFor.toFixed(1)}</dd>
                  </div>
                  <div>
                    <dt>Last 5 xGA</dt>
                    <dd>{team.form.xgAgainst.toFixed(1)}</dd>
                  </div>
                </dl>
              </div>
            </Panel>

            <Panel title="Next Fixture" icon={<CalendarDays size={18} />}>
              {nextFixture ? (
                <div className="next-fixture-card">
                  <span>{formatDateTime(nextFixture.kickoff)}</span>
                  <strong>
                    {nextFixture.home.name} v {nextFixture.away.name}
                  </strong>
                  <small>{nextFixture.venue}</small>
                </div>
              ) : (
                <div className="stats-empty">No upcoming fixture loaded.</div>
              )}
            </Panel>

            <Panel title="Data Status" icon={<Database size={18} />}>
              <div className="data-requirements">
                <div>
                  <strong>{dossierLoading ? "Loading live dossier" : dossier?.dataStatus.source ?? "Fixture snapshot"}</strong>
                  <span>
                    {dossier
                      ? `Requested ${formatSeasonLabel(selectedSeason)}. API-Football returned ${formatSeasonLabel(dossier.dataStatus.season)}, refreshed ${formatDateTime(dossier.dataStatus.refreshedAt)}.`
                      : apiTeamId
                        ? "Waiting for cached API-Football team dossier."
                        : "No numeric API-Football team id available for this team yet."}
                  </span>
                </div>
                {dossier?.dataStatus.errors.slice(0, 2).map((error) => (
                  <div key={error}>
                    <strong>Partial data</strong>
                    <span>{error}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </section>
        </>
      ) : null}

      {activeTab === "squad" ? (
        <section className="detail-grid">
          <Panel title="Squad Composition" icon={<Activity size={18} />}>
            <div className="position-grid">
              {positionCounts.map(({ position, count }) => (
                <Metric label={position} value={String(count)} key={position} />
              ))}
            </div>
            <div className="data-note">
              Full squad depth should come from API-Football `/players/squads` and season stats from `/players`.
            </div>
          </Panel>

          <Panel title="Availability Snapshot" icon={<ShieldCheck size={18} />}>
            <div className="detail-metrics compact">
              <Metric label="Players loaded" value={String(squadPlayers?.length ?? team.players.length)} />
              <Metric label="Likely starters" value={String(likelyStarters.length)} />
            </div>
            {dossier?.injuries.length ? (
              <div className="lineup-list">
                {dossier.injuries.slice(0, 5).map((injury) => (
                  <div className="lineup-row" key={`${injury.player}-${injury.fixture ?? injury.reason ?? ""}`}>
                    <strong>{injury.player}</strong>
                    <span>{injury.reason ?? injury.type ?? "Listed injury"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="data-note">
                {dossier ? "No current injuries returned by API-Football for this team/season." : "Injuries will load from `/injuries` when the dossier is available."}
              </div>
            )}
          </Panel>

          <Panel title="Squad List" icon={<Activity size={18} />} wide>
          <div className="scorer-table">
            <div className="table-head">
              <span>Player</span>
              <span>Position</span>
              <span>{squadPlayers ? "Apps" : "Starts"}</span>
              <span>{squadPlayers ? "Goals" : "Season xG/90"}</span>
              <span>{squadPlayers ? "Minutes" : "Recent xG/90"}</span>
            </div>
            {(squadPlayers ?? team.players).map((player) => (
              <div className="table-row" key={player.id}>
                <span>{player.name}</span>
                <span>{player.position ?? "n/a"}</span>
                <strong>{"startsLikely" in player ? (player.startsLikely ? "Likely" : "Doubt") : String(player.appearances ?? "n/a")}</strong>
                <span>{"seasonXgPer90" in player ? player.seasonXgPer90.toFixed(2) : String(player.goals ?? 0)}</span>
                <span>{"recentXgPer90" in player ? player.recentXgPer90.toFixed(2) : (player.minutes ? formatNumber(player.minutes) : "n/a")}</span>
              </div>
            ))}
          </div>
          </Panel>
        </section>
      ) : null}

      {activeTab === "lineups" ? (
        <section className="detail-grid">
          <Panel title="Formation Profile" icon={<Target size={18} />}>
            <div className="formation-card">
              <span>{dossier?.recentLineups[0]?.formation ? "Latest recorded setup" : "Estimated setup"}</span>
              <strong>{dossier?.recentLineups[0]?.formation ?? probableFormation}</strong>
              <small>
                {dossier?.recentLineups[0]
                  ? `From recent lineup against ${dossier.recentLineups[0].opponent}.`
                  : "Based on the currently loaded player snapshot."}
              </small>
            </div>
            <div className="data-note">
              Previous formations and confirmed lineups should come from `/fixtures/lineups`.
            </div>
          </Panel>

          <Panel title="Likely XI Snapshot" icon={<ShieldCheck size={18} />}>
            <div className="lineup-list">
              {likelyStarters.length > 0 ? (
                likelyStarters.map((player) => (
                  <div className="lineup-row" key={player.id}>
                    <strong>{player.name}</strong>
                    <span>{player.position}</span>
                  </div>
                ))
              ) : (
                <div className="stats-empty">No likely starter data loaded.</div>
              )}
            </div>
          </Panel>

          <Panel title="Previous Lineups" icon={<Database size={18} />} wide>
            {dossier?.recentLineups.length ? (
              <div className="data-requirements">
                {dossier.recentLineups.map((lineup) => (
                  <div key={lineup.fixtureId}>
                    <strong>
                      {formatDate(lineup.date)} vs {lineup.opponent} {lineup.formation ? `(${lineup.formation})` : ""}
                    </strong>
                    <span>{lineup.startXI.slice(0, 11).join(", ")}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="data-note">
                Previous formations and starting XIs will populate from `/fixtures/lineups` when available on your API plan.
              </div>
            )}
          </Panel>
        </section>
      ) : null}

      {activeTab === "manager" ? (
        <section className="detail-grid">
          <Panel title="Manager Profile" icon={<Trophy size={18} />}>
            <div className="manager-card">
              {dossier?.coach?.photo ? <img className="person-image" src={dossier.coach.photo} alt="" aria-hidden="true" loading="lazy" /> : null}
              <span>Manager</span>
              <strong>{dossier?.coach?.name || "Not loaded yet"}</strong>
              <small>
                {dossier?.coach
                  ? [dossier.coach.nationality, dossier.coach.age ? `${dossier.coach.age} years old` : ""].filter(Boolean).join(" | ")
                  : "Connect API-Football /coachs?team=TEAM_ID to populate name, nationality, age, and career."}
              </small>
            </div>
          </Panel>

          <Panel title="Manager Record" icon={<TrendingUp size={18} />}>
            <div className="data-requirements">
              <div>
                <strong>Current spell record</strong>
                <span>Next step: derive wins, draws, losses, goals for/against from cached team fixtures.</span>
              </div>
              <div>
                <strong>Formation preference</strong>
                <span>
                  {dossier?.recentLineups.length
                    ? dossier.recentLineups.map((lineup) => lineup.formation).filter(Boolean).join(", ")
                    : "Derived from recent `/fixtures/lineups`."}
                </span>
              </div>
              <div>
                <strong>Home/away split</strong>
                <span>Derived from `/fixtures` results by venue side.</span>
              </div>
            </div>
          </Panel>
        </section>
      ) : null}

      {activeTab === "stadium" ? (
        <section className="detail-grid">
          <Panel title="Stadium Profile" icon={<Trophy size={18} />}>
            <div className="stadium-card">
              {stadiumImageUrl ? <img className="stadium-image" src={stadiumImageUrl} alt="" aria-hidden="true" loading="lazy" /> : null}
              <span>Home ground</span>
              <strong>
                {clubProfile?.stadium.name ??
                  dossier?.venue?.name ??
                  (nextFixture?.venue && nextFixture.venue !== "TBC" ? nextFixture.venue : "Venue not loaded")}
              </strong>
              <small>
                {clubProfile
                  ? `Curated EPL profile, verified ${clubProfile.lastVerified}`
                  : "Connect API-Football /venues or team venue metadata for full stadium details."}
              </small>
            </div>
          </Panel>

          <Panel title="Venue Facts" icon={<Database size={18} />}>
            <div className="venue-facts">
              <Metric
                label="Capacity"
                value={
                  clubProfile?.stadium.capacity
                    ? formatNumber(clubProfile.stadium.capacity)
                    : dossier?.venue?.capacity
                      ? formatNumber(dossier.venue.capacity)
                      : "Not loaded"
                }
              />
              <Metric label="Opened" value={clubProfile?.stadium.opened ? String(clubProfile.stadium.opened) : "Not loaded"} />
              <Metric label="Roof" value={clubProfile?.stadium.roof ?? "Not loaded"} />
              <Metric label="Surface" value={clubProfile?.stadium.surface ?? dossier?.venue?.surface ?? "Not loaded"} />
              <Metric label="City" value={clubProfile?.stadium.city ?? dossier?.venue?.city ?? "Not loaded"} />
              <Metric label="Source" value={clubProfile ? "Curated + API" : dossier?.venue ? "API-Football" : "API needed"} />
            </div>
          </Panel>

          <Panel title={clubProfile ? "Stadium Notes" : "Stadium Intelligence Needed"} icon={<ShieldCheck size={18} />} wide>
            <div className="data-requirements">
              {clubProfile?.stadium.notes ? (
                <div>
                  <strong>Notes</strong>
                  <span>{clubProfile.stadium.notes}</span>
                </div>
              ) : null}
              <div>
                <strong>Capacity and location</strong>
                <span>
                  {clubProfile ? "Loaded from curated EPL profile." : "Use `/venues?id=VENUE_ID` or venue metadata returned by `/teams`."}
                </span>
              </div>
              <div>
                <strong>Betting relevance</strong>
                <span>Track home advantage, pitch/surface notes, weather exposure, and travel context.</span>
              </div>
              {clubProfile ? (
                <div>
                  <strong>Sources</strong>
                  <span>{clubProfile.sources.join(", ")}</span>
                </div>
              ) : null}
            </div>
          </Panel>
        </section>
      ) : null}

      {activeTab === "fixtures" ? (
        <section className="detail-grid">
          {dossier?.recentFixtures.length ? (
            <Panel title="Recent Results" icon={<ShieldCheck size={18} />} wide>
              <div className="detail-fixture-list">
                {dossier.recentFixtures.map((fixture) => (
                  <div className="detail-fixture-row" key={fixture.id}>
                    <span>{formatDateTime(fixture.date)}</span>
                    <strong>
                      {fixture.home} {fixture.homeGoals ?? "-"}-{fixture.awayGoals ?? "-"} {fixture.away}
                    </strong>
                    <small>{fixture.venue ?? "Venue n/a"}</small>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}
          <Panel title="Loaded Fixtures" icon={<CalendarDays size={18} />} wide>
            <div className="detail-fixture-list">
              {summary.fixtures.map((fixture) => (
                <div className="detail-fixture-row" key={fixture.id}>
                  <span>{formatDateTime(fixture.kickoff)}</span>
                  <strong>
                    {fixture.home.name} v {fixture.away.name}
                  </strong>
                  <small>{fixture.venue}</small>
                </div>
              ))}
            </div>
          </Panel>
        </section>
      ) : null}
    </>
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

function LogoMark({ src, label, size = "medium" }: { src?: string; label: string; size?: "small" | "medium" | "large" }) {
  return src ? (
    <img className={`logo-mark ${size}`} src={src} alt="" aria-hidden="true" loading="lazy" />
  ) : (
    <span className={`logo-mark fallback ${size}`} aria-hidden="true">
      {getInitials(label)}
    </span>
  );
}

function getTeamLogoUrl(team: TeamSnapshot) {
  return team.logoUrl ?? getClubCrestUrl(findClubProfile(team.id, team.name));
}

function getApiFootballTeamId(team: TeamSnapshot, profile: ReturnType<typeof findClubProfile>) {
  const numericId = Number(team.id);
  return Number.isFinite(numericId) ? numericId : profile?.apiFootballTeamId;
}

function getStadiumImageUrl(summary: TeamSummary) {
  const profile = findClubProfile(summary.team.id, summary.team.name);
  return profile?.media?.stadiumImageUrl ?? summary.fixtures.find((fixture) => Boolean(fixture.venueImageUrl))?.venueImageUrl;
}

function getInitials(label: string) {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
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
  const leagues = new Map<string, { fixtures: Fixture[]; teams: Set<string>; logoUrl?: string }>();

  fixtures.forEach((fixture) => {
    const current = leagues.get(fixture.competition) ?? { fixtures: [], teams: new Set<string>(), logoUrl: undefined };
    current.fixtures.push(fixture);
    current.teams.add(fixture.home.id);
    current.teams.add(fixture.away.id);
    current.logoUrl = current.logoUrl ?? fixture.competitionLogoUrl ?? getLeagueLogoUrl(fixture.competition);
    leagues.set(fixture.competition, current);
  });

  return Array.from(leagues.entries())
    .map(([name, value]) => ({
      name,
      logoUrl: value.logoUrl,
      fixtureCount: value.fixtures.length,
      teamCount: value.teams.size,
      fixtures: value.fixtures
        .slice()
        .sort((first, second) => new Date(first.kickoff).getTime() - new Date(second.kickoff).getTime()),
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
          nextFixture: current?.nextFixture ?? fixture,
          fixtures: [...(current?.fixtures ?? []), fixture]
        });
      });
    });

  return Array.from(teams.values()).sort((first, second) => {
    const leagueSort = first.league.localeCompare(second.league);
    return leagueSort !== 0 ? leagueSort : first.team.name.localeCompare(second.team.name);
  });
}

function getTeamSummaryKey(summary: TeamSummary) {
  return `${summary.league}:${summary.team.id}`;
}

function getPositionCounts(players: TeamSnapshot["players"]) {
  const counts = players.reduce((current, player) => {
    current.set(player.position, (current.get(player.position) ?? 0) + 1);
    return current;
  }, new Map<string, number>());

  return Array.from(counts.entries())
    .map(([position, count]) => ({ position, count }))
    .sort((first, second) => first.position.localeCompare(second.position));
}

function getPositionCountsFromDossier(players: TeamDossier["squad"] | undefined) {
  if (!players?.length) return undefined;

  const counts = players.reduce((current, player) => {
    const position = player.position ?? "Unknown";
    current.set(position, (current.get(position) ?? 0) + 1);
    return current;
  }, new Map<string, number>());

  return Array.from(counts.entries())
    .map(([position, count]) => ({ position, count }))
    .sort((first, second) => first.position.localeCompare(second.position));
}

function estimateFormation(players: TeamSnapshot["players"]) {
  const hasAttackingMid = players.some((player) => player.position === "AM");
  const forwardCount = players.filter((player) => player.position === "FW").length;

  if (forwardCount >= 2 && hasAttackingMid) {
    return "4-2-3-1 / 4-4-2 hybrid";
  }

  if (forwardCount >= 2) {
    return "4-4-2 estimate";
  }

  return "4-2-3-1 estimate";
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short"
  }).format(new Date(value));
}

function formatSeasonLabel(season: number) {
  return `${season}/${String(season + 1).slice(-2)}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-GB").format(value);
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
