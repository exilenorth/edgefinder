import React from "react";
import { Activity, CalendarDays, Database, Goal, Search, ShieldCheck, Star, Target, TrendingUp, Trophy, UserRound } from "lucide-react";
import type { LeagueSummary, ResearchEntity, TeamSummary } from "../../app/types";
import { FollowToggle } from "../../components/FollowToggle";
import { LogoMark } from "../../components/LogoMark";
import { Metric } from "../../components/Metric";
import { Panel } from "../../components/Panel";
import { findClubProfile, getCurrentEplTeams, getLeagueLogoUrl } from "../../data/eplClubProfiles";
import { apiConfig } from "../../config/apiConfig";
import type { Fixture, LeagueHistoricalDossier, Result, TeamDossier, TeamSnapshot } from "../../types";
import { getTeamLogoUrl } from "../../utils/teamAssets";

const DEFAULT_STATS_SEASON = apiConfig.apiFootballSeason;
const STATS_SEASON_OPTIONS = Array.from({ length: 4 }, (_, index) => DEFAULT_STATS_SEASON - index);
const CONFIGURED_LEAGUE_NAME = "Premier League";

type StatsMode = "current" | "historical";
type StatsTab = "leagues" | "teams" | "players";
type TeamInsightTab = "overview" | "squad" | "lineups" | "manager" | "stadium" | "fixtures" | "transfers";

interface CoverageItem {
  label: string;
  enabled: boolean;
  note?: string;
}

export function ResearchHubWorkspace({
  leagueSummaries,
  teamSummaries,
  followedLeagues,
  followedTeamIds,
  onToggleLeague,
  onToggleTeam,
  selectedResearchEntity,
  onOpenFixtureInAssistant
}: {
  leagueSummaries: LeagueSummary[];
  teamSummaries: TeamSummary[];
  followedLeagues: Set<string>;
  followedTeamIds: Set<string>;
  onToggleLeague: (league: string) => void;
  onToggleTeam: (team: TeamSnapshot) => void;
  selectedResearchEntity?: ResearchEntity;
  onOpenFixtureInAssistant: (fixtureId: string) => void;
}) {
  const [statsTab, setStatsTab] = React.useState<StatsTab>("leagues");
  const [statsMode, setStatsMode] = React.useState<StatsMode>("current");
  const [query, setQuery] = React.useState("");
  const [followedOnly, setFollowedOnly] = React.useState(false);
  const [selectedSeason, setSelectedSeason] = React.useState(DEFAULT_STATS_SEASON);
  const [historicalDossier, setHistoricalDossier] = React.useState<LeagueHistoricalDossier | undefined>();
  const [historicalLoading, setHistoricalLoading] = React.useState(false);
  const [historicalError, setHistoricalError] = React.useState<string | undefined>();
  const [selectedLeagueName, setSelectedLeagueName] = React.useState(leagueSummaries[0]?.name ?? "");
  const [selectedTeamKey, setSelectedTeamKey] = React.useState(
    teamSummaries[0] ? getTeamSummaryKey(teamSummaries[0]) : ""
  );

  const currentLeagueSummaries = React.useMemo(
    () => {
      const fixtureLeagues = leagueSummaries.filter((league) => isConfiguredLeague(league.name));
      const configuredLeague = fixtureLeagues[0];
      if (configuredLeague?.teamCount >= 10) return fixtureLeagues;
      return [buildCurrentEplLeagueSummary(configuredLeague)];
    },
    [leagueSummaries]
  );
  const currentTeamSummaries = React.useMemo(
    () => {
      const fixtureTeams = teamSummaries.filter((team) => isConfiguredLeague(team.league));
      if (fixtureTeams.length >= 10) return fixtureTeams;
      return buildCurrentEplTeamSummaries(fixtureTeams);
    },
    [teamSummaries]
  );
  const historicalLeagueSummaries = React.useMemo(
    () => (historicalDossier ? [buildHistoricalLeagueSummary(historicalDossier)] : []),
    [historicalDossier]
  );
  const historicalTeamSummaries = React.useMemo(
    () => (historicalDossier ? buildHistoricalTeamSummaries(historicalDossier) : []),
    [historicalDossier]
  );
  const browsedLeagueSummaries = statsMode === "historical" ? historicalLeagueSummaries : currentLeagueSummaries;
  const browsedTeamSummaries = statsMode === "historical" ? historicalTeamSummaries : currentTeamSummaries;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredLeagues = browsedLeagueSummaries.filter((league) => {
    const matchesQuery = !normalizedQuery || league.name.toLowerCase().includes(normalizedQuery);
    const matchesFollowed = !followedOnly || followedLeagues.has(league.name);
    return matchesQuery && matchesFollowed;
  });
  const filteredTeams = browsedTeamSummaries.filter(({ team, league }) => {
    const matchesQuery =
      !normalizedQuery ||
      team.name.toLowerCase().includes(normalizedQuery) ||
      league.toLowerCase().includes(normalizedQuery);
    const matchesFollowed = !followedOnly || followedTeamIds.has(team.id);
    return matchesQuery && matchesFollowed;
  });
  const selectedLeague =
    browsedLeagueSummaries.find((league) => league.name === selectedLeagueName) ?? filteredLeagues[0] ?? browsedLeagueSummaries[0];
  const selectedTeam =
    browsedTeamSummaries.find((team) => getTeamSummaryKey(team) === selectedTeamKey) ?? filteredTeams[0] ?? browsedTeamSummaries[0];

  React.useEffect(() => {
    if (!selectedLeagueName && browsedLeagueSummaries[0]) {
      setSelectedLeagueName(browsedLeagueSummaries[0].name);
    }
  }, [browsedLeagueSummaries, selectedLeagueName]);

  React.useEffect(() => {
    if (!selectedTeamKey && browsedTeamSummaries[0]) {
      setSelectedTeamKey(getTeamSummaryKey(browsedTeamSummaries[0]));
    }
  }, [browsedTeamSummaries, selectedTeamKey]);

  React.useEffect(() => {
    if (browsedLeagueSummaries.length > 0 && !browsedLeagueSummaries.some((league) => league.name === selectedLeagueName)) {
      setSelectedLeagueName(browsedLeagueSummaries[0].name);
    }
  }, [browsedLeagueSummaries, selectedLeagueName]);

  React.useEffect(() => {
    if (browsedTeamSummaries.length > 0 && !browsedTeamSummaries.some((team) => getTeamSummaryKey(team) === selectedTeamKey)) {
      setSelectedTeamKey(getTeamSummaryKey(browsedTeamSummaries[0]));
    }
  }, [browsedTeamSummaries, selectedTeamKey]);

  React.useEffect(() => {
    if (!selectedResearchEntity) return;

    if (selectedResearchEntity.type === "league") {
      setStatsMode("current");
      setStatsTab("leagues");
      setSelectedLeagueName(selectedResearchEntity.name);
      setQuery("");
      setFollowedOnly(false);
      return;
    }

    if (selectedResearchEntity.type === "team") {
      setStatsMode("current");
      setStatsTab("teams");
      setQuery("");
      setFollowedOnly(false);

      const matchingTeam =
        currentTeamSummaries.find((summary) => summary.team.id === selectedResearchEntity.id) ??
        currentTeamSummaries.find(
          (summary) => normalizeTeamName(summary.team.name) === normalizeTeamName(selectedResearchEntity.name)
        );

      if (matchingTeam) {
        setSelectedTeamKey(getTeamSummaryKey(matchingTeam));
      }
    }
  }, [currentTeamSummaries, selectedResearchEntity]);

  React.useEffect(() => {
    if (statsMode !== "historical") return;

    let cancelled = false;
    setHistoricalLoading(true);
    setHistoricalError(undefined);
    fetch(`/api/leagues/${apiConfig.apiFootballLeagueId}/historical?season=${selectedSeason}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Historical league request failed: ${response.status}`);
        return response.json() as Promise<LeagueHistoricalDossier>;
      })
      .then((dossier) => {
        if (!cancelled) setHistoricalDossier(dossier);
      })
      .catch((error) => {
        console.warn("Historical league request failed", error);
        if (!cancelled) {
          setHistoricalDossier(undefined);
          setHistoricalError(error instanceof Error ? error.message : "Historical league request failed.");
        }
      })
      .finally(() => {
        if (!cancelled) setHistoricalLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSeason, statsMode]);

  return (
    <section className="workspace stats-workspace">
      <header className="stats-header">
        <div>
          <p>Research Hub</p>
          <h1>League, team, player, and fixture intelligence</h1>
          <div className="meta-row">
            <span>{browsedLeagueSummaries.length} leagues</span>
            <span>{browsedTeamSummaries.length} teams</span>
            <span>{browsedTeamSummaries.filter((item) => followedTeamIds.has(item.team.id)).length} followed teams</span>
          </div>
        </div>
      </header>

      <section className="stats-toolbar" aria-label="Stats filters">
        <label className="stats-search">
          <Search size={17} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search leagues, teams, or players"
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
        <div className="stats-mode-toggle" aria-label="Stats mode">
          <button className={statsMode === "current" ? "is-active" : ""} type="button" onClick={() => setStatsMode("current")}>
            Current
          </button>
          <button className={statsMode === "historical" ? "is-active" : ""} type="button" onClick={() => setStatsMode("historical")}>
            Historical
          </button>
        </div>
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

      <section className={`research-mode-note ${statsMode}`} aria-label="Research mode context">
        <strong>{statsMode === "current" ? "Current season workspace" : "Historical season workspace"}</strong>
        <span>
          {statsMode === "current"
            ? "Current views blend loaded fixtures, curated EPL profiles, cached provider data, and clearly marked estimates."
            : "Historical views are intended to be API-backed once per completed season, then treated as static local evidence."}
        </span>
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
            <button
              className={statsTab === "players" ? "is-active" : ""}
              type="button"
              onClick={() => setStatsTab("players")}
            >
              Players
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
          ) : statsTab === "teams" ? (
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
          ) : (
            <div className="stats-browser-list">
              <div className="stats-browser-note">
                <UserRound size={18} aria-hidden="true" />
                <strong>Player research coming soon</strong>
                <span>Player pages will use season stats, match stats, lineups, injuries, and scorer-market relevance.</span>
              </div>
            </div>
          )}
        </aside>

        <div className="stats-detail">
          {statsTab === "players" ? (
            <PlayerResearchPlaceholder statsMode={statsMode} selectedSeason={selectedSeason} />
          ) : statsMode === "historical" ? (
            statsTab === "teams" && selectedTeam ? (
              <TeamDetail
                summary={selectedTeam}
                followed={followedTeamIds.has(selectedTeam.team.id)}
                selectedSeason={selectedSeason}
                onToggleFollow={() => onToggleTeam(selectedTeam.team)}
              />
            ) : (
              <HistoricalLeagueDetail
                dossier={historicalDossier}
                loading={historicalLoading}
                error={historicalError}
                selectedSeason={selectedSeason}
              />
            )
          ) : statsTab === "leagues" && selectedLeague ? (
            <LeagueDetail
              league={selectedLeague}
              teamSummaries={browsedTeamSummaries.filter((team) => team.league === selectedLeague.name)}
              followed={followedLeagues.has(selectedLeague.name)}
              onToggleFollow={() => onToggleLeague(selectedLeague.name)}
              onSelectTeam={(team) => {
                setStatsTab("teams");
                setSelectedTeamKey(getTeamSummaryKey(team));
              }}
              onOpenFixtureInAssistant={onOpenFixtureInAssistant}
            />
          ) : selectedTeam ? (
            <TeamDetail
              summary={selectedTeam}
              followed={followedTeamIds.has(selectedTeam.team.id)}
              selectedSeason={selectedSeason}
              onToggleFollow={() => onToggleTeam(selectedTeam.team)}
              onOpenFixtureInAssistant={onOpenFixtureInAssistant}
            />
          ) : (
            <div className="stats-empty">No matching stats loaded.</div>
          )}
        </div>
      </section>
    </section>
  );
}

function HistoricalLeagueDetail({
  dossier,
  loading,
  error,
  selectedSeason
}: {
  dossier: LeagueHistoricalDossier | undefined;
  loading: boolean;
  error?: string;
  selectedSeason: number;
}) {
  const coverageItems = dossier?.coverage ? flattenCoverage(dossier.coverage) : [];

  return (
    <>
      <header className="detail-header">
        <div className="entity-heading">
          <LogoMark src={dossier?.league.logo ?? getLeagueLogoUrl("Premier League")} label={dossier?.league.name ?? "Premier League"} size="large" />
          <div>
            <p>Historical Season</p>
            <h2>{dossier?.league.name ?? "Premier League"}</h2>
            <span className="season-chip">Viewing {formatSeasonLabel(selectedSeason)}</span>
          </div>
        </div>
      </header>

      <section className="detail-metrics" aria-label="Historical season status">
        <Metric label="Data status" value={loading ? "Loading" : dossier?.dataStatus.source ?? "Not loaded"} />
        <Metric label="Table rows" value={String(dossier?.standings.length ?? 0)} />
        <Metric label="Top scorers" value={String(dossier?.topScorers.length ?? 0)} />
        <Metric label="Top assists" value={String(dossier?.topAssists.length ?? 0)} />
      </section>

      <section className="detail-grid">
        <Panel title="Final League Table" icon={<Trophy size={18} />} wide>
          {dossier?.standings.length ? (
            <div className="standings-table">
              <div className="standings-head">
                <span>#</span>
                <span>Team</span>
                <span>P</span>
                <span>W</span>
                <span>D</span>
                <span>L</span>
                <span>GD</span>
                <span>Pts</span>
              </div>
              {dossier.standings.map((standing) => (
                <div className="standings-row" key={standing.teamId}>
                  <span>{standing.rank}</span>
                  <strong className="ranking-team">
                    <LogoMark src={standing.logo} label={standing.team} size="small" />
                    {standing.team}
                  </strong>
                  <span>{standing.played ?? "n/a"}</span>
                  <span>{standing.wins ?? "n/a"}</span>
                  <span>{standing.draws ?? "n/a"}</span>
                  <span>{standing.losses ?? "n/a"}</span>
                  <span>{standing.goalDifference ?? "n/a"}</span>
                  <strong>{standing.points ?? "n/a"}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="stats-empty">
              {loading
                ? "Loading historical table..."
                : error
                  ? `Historical data request failed: ${error}`
                  : "No historical table returned for this season."}
            </div>
          )}
        </Panel>

        <Panel title="Top Scorers" icon={<Goal size={18} />}>
          <PlayerRankings players={dossier?.topScorers ?? []} metric="goals" />
        </Panel>

        <Panel title="Top Assists" icon={<Activity size={18} />}>
          <PlayerRankings players={dossier?.topAssists ?? []} metric="assists" />
        </Panel>

        <CoveragePanel
          title="Coverage / Data Availability"
          items={coverageItems}
          empty="Coverage data is not available for this league-season yet."
        />
      </section>
    </>
  );
}

function PlayerResearchPlaceholder({
  statsMode,
  selectedSeason
}: {
  statsMode: StatsMode;
  selectedSeason: number;
}) {
  return (
    <>
      <header className="detail-header">
        <div className="entity-heading">
          <LogoMark label="Players" size="large" />
          <div>
            <p>Player Research</p>
            <h2>Player intelligence workspace</h2>
            <span className="season-chip">
              {statsMode === "historical" ? "Historical" : "Current"} | {formatSeasonLabel(selectedSeason)}
            </span>
          </div>
        </div>
      </header>

      <section className="detail-grid">
        <Panel title="Players Coming Soon" icon={<UserRound size={18} />} wide>
          <div className="placeholder-panel">
            <strong>Player-level research will sit here.</strong>
            <span>
              This area will cover minutes, starts, goals, assists, injuries, shots, cards, and scorer-market relevance once the
              player sync layer is in place.
            </span>
          </div>
        </Panel>

        <Panel title="Planned Player Evidence" icon={<Database size={18} />}>
          <div className="data-requirements">
            <div>
              <strong>Season profile</strong>
              <span>Minutes, starts, goals, assists, shots, and card context from `/players`.</span>
            </div>
            <div>
              <strong>Match trend</strong>
              <span>Per-fixture player stats from `/fixtures/players` where available.</span>
            </div>
            <div>
              <strong>Availability</strong>
              <span>Injuries, suspensions, and expected starter signals from `/injuries` and `/fixtures/lineups`.</span>
            </div>
          </div>
        </Panel>

        <CoveragePanel title="Player Coverage Targets" items={getPlayerCoverageItems()} />
      </section>
    </>
  );
}

function PlayerRankings({
  players,
  metric
}: {
  players: LeagueHistoricalDossier["topScorers"];
  metric: "goals" | "assists";
}) {
  return (
    <div className="ranking-list">
      {players.length ? (
        players.slice(0, 10).map((player, index) => (
          <div className="ranking-row" key={`${metric}-${player.playerId}`}>
            <span>{index + 1}</span>
            <strong>{player.player}</strong>
            <small>
              {metric === "goals" ? player.goals ?? 0 : player.assists ?? 0} | {player.team}
            </small>
          </div>
        ))
      ) : (
        <div className="stats-empty">No ranking data returned.</div>
      )}
    </div>
  );
}

function LeagueDetail({
  league,
  teamSummaries,
  followed,
  onToggleFollow,
  onSelectTeam,
  onOpenFixtureInAssistant
}: {
  league: LeagueSummary;
  teamSummaries: TeamSummary[];
  followed: boolean;
  onToggleFollow: () => void;
  onSelectTeam: (team: TeamSummary) => void;
  onOpenFixtureInAssistant: (fixtureId: string) => void;
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
            {league.fixtures.length ? (
              league.fixtures.slice(0, 10).map((fixture) => (
                <button
                  className="detail-fixture-row linked-fixture-row"
                  type="button"
                  key={fixture.id}
                  onClick={() => onOpenFixtureInAssistant(fixture.id)}
                >
                  <span>{formatDateTime(fixture.kickoff)}</span>
                  <strong>
                    {fixture.home.name} v {fixture.away.name}
                  </strong>
                  <small>{fixture.venue}</small>
                </button>
              ))
            ) : (
              <div className="stats-empty">No current fixtures are loaded for this league yet.</div>
            )}
          </div>
        </Panel>

        <CoveragePanel title="Coverage / Data Availability" items={getCurrentCoverageItems()} />
      </section>
    </>
  );
}

function CoveragePanel({
  title,
  items,
  empty
}: {
  title: string;
  items: CoverageItem[];
  empty?: string;
}) {
  return (
    <Panel title={title} icon={<Database size={18} />} wide>
      {items.length ? (
        <div className="coverage-grid">
          {items.map((item) => (
            <div className={item.enabled ? "coverage-item is-on" : "coverage-item"} key={item.label}>
              <strong>{item.enabled ? "Available" : "Unavailable"}</strong>
              <span>{item.label}</span>
              {item.note ? <small>{item.note}</small> : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="stats-empty">{empty ?? "Coverage data is not available yet."}</div>
      )}
    </Panel>
  );
}

function TeamDetail({
  summary,
  followed,
  selectedSeason,
  onToggleFollow,
  onOpenFixtureInAssistant
}: {
  summary: TeamSummary;
  followed: boolean;
  selectedSeason: number;
  onToggleFollow: () => void;
  onOpenFixtureInAssistant?: (fixtureId: string) => void;
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
          ["fixtures", "Fixtures"],
          ["transfers", "Transfers"]
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
                <button
                  className="detail-fixture-row linked-fixture-row"
                  type="button"
                  key={fixture.id}
                  onClick={() => onOpenFixtureInAssistant?.(fixture.id)}
                >
                  <span>{formatDateTime(fixture.kickoff)}</span>
                  <strong>
                    {fixture.home.name} v {fixture.away.name}
                  </strong>
                  <small>{fixture.venue}</small>
                </button>
              ))}
            </div>
          </Panel>
        </section>
      ) : null}

      {activeTab === "transfers" ? (
        <section className="detail-grid">
          <Panel title="Transfers In" icon={<TrendingUp size={18} />}>
            <TransferList transfers={dossier?.transfers.filter((transfer) => transfer.direction === "in") ?? []} empty="No incoming transfers returned for this season." />
          </Panel>

          <Panel title="Transfers Out" icon={<Activity size={18} />}>
            <TransferList transfers={dossier?.transfers.filter((transfer) => transfer.direction === "out") ?? []} empty="No outgoing transfers returned for this season." />
          </Panel>

          <Panel title="Squad Churn Context" icon={<Database size={18} />} wide>
            <div className="data-note">
              Transfers are filtered to the selected season window and are useful context for chemistry, minutes distribution, and whether historical team stats are comparable to the current squad.
            </div>
          </Panel>
        </section>
      ) : null}
    </>
  );
}

function TransferList({ transfers, empty }: { transfers: TeamDossier["transfers"]; empty: string }) {
  return transfers.length ? (
    <div className="data-requirements">
      {transfers.map((transfer) => (
        <div key={`${transfer.player}-${transfer.date}-${transfer.in}-${transfer.out}`}>
          <strong>{transfer.player}</strong>
          <span>
            {transfer.date ? formatDate(transfer.date) : "Date n/a"} | {transfer.out ?? "Unknown"} to {transfer.in ?? "Unknown"} | {transfer.type ?? "n/a"}
          </span>
        </div>
      ))}
    </div>
  ) : (
    <div className="stats-empty">{empty}</div>
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

function getApiFootballTeamId(team: TeamSnapshot, profile: ReturnType<typeof findClubProfile>) {
  const numericId = Number(team.id);
  return Number.isFinite(numericId) ? numericId : profile?.apiFootballTeamId;
}

function getStadiumImageUrl(summary: TeamSummary) {
  const profile = findClubProfile(summary.team.id, summary.team.name);
  return profile?.media?.stadiumImageUrl ?? summary.fixtures.find((fixture) => Boolean(fixture.venueImageUrl))?.venueImageUrl;
}

function buildHistoricalLeagueSummary(dossier: LeagueHistoricalDossier): LeagueSummary {
  return {
    name: dossier.league.name ?? CONFIGURED_LEAGUE_NAME,
    logoUrl: dossier.league.logo ?? getLeagueLogoUrl(CONFIGURED_LEAGUE_NAME),
    fixtureCount: 0,
    teamCount: dossier.standings.length,
    fixtures: []
  };
}

function buildCurrentEplLeagueSummary(fixtureLeague: LeagueSummary | undefined): LeagueSummary {
  const currentTeams = getCurrentEplTeams();

  return {
    name: CONFIGURED_LEAGUE_NAME,
    logoUrl: fixtureLeague?.logoUrl ?? getLeagueLogoUrl(CONFIGURED_LEAGUE_NAME),
    fixtureCount: fixtureLeague?.fixtureCount ?? 0,
    teamCount: currentTeams.length,
    nextKickoff: fixtureLeague?.nextKickoff,
    fixtures: fixtureLeague?.fixtures ?? []
  };
}

function buildCurrentEplTeamSummaries(fixtureTeams: TeamSummary[]): TeamSummary[] {
  const teamsById = new Map(fixtureTeams.map((summary) => [summary.team.id, summary]));
  const teamsByName = new Map(fixtureTeams.map((summary) => [normalizeTeamName(summary.team.name), summary]));

  return getCurrentEplTeams().map((team) => {
    const existing = teamsById.get(team.id) ?? teamsByName.get(normalizeTeamName(team.name));
    if (existing) {
      return {
        ...existing,
        team: {
          ...existing.team,
          id: team.id,
          name: team.name,
          logoUrl: existing.team.logoUrl ?? team.logoUrl
        },
        league: CONFIGURED_LEAGUE_NAME
      };
    }

    return {
      team: {
        id: team.id,
        name: team.name,
        logoUrl: team.logoUrl,
        attackRating: 1.2,
        defenceRating: 1.2,
        form: {
          results: ["D", "D", "D", "D", "D"],
          goalsFor: 0,
          goalsAgainst: 0,
          xgFor: 0,
          xgAgainst: 0
        },
        players: []
      },
      league: CONFIGURED_LEAGUE_NAME,
      fixtureCount: 0,
      fixtures: []
    };
  });
}

function buildHistoricalTeamSummaries(dossier: LeagueHistoricalDossier): TeamSummary[] {
  const leagueName = dossier.league.name ?? CONFIGURED_LEAGUE_NAME;

  return dossier.standings.map((standing) => ({
    team: {
      id: String(standing.teamId),
      name: standing.team,
      logoUrl: standing.logo,
      attackRating: estimateHistoricalAttackRating(standing),
      defenceRating: estimateHistoricalDefenceRating(standing),
      form: {
        results: parseHistoricalForm(standing.form),
        goalsFor: standing.goalsFor ?? 0,
        goalsAgainst: standing.goalsAgainst ?? 0,
        xgFor: standing.goalsFor ?? 0,
        xgAgainst: standing.goalsAgainst ?? 0
      },
      players: []
    },
    league: leagueName,
    fixtureCount: standing.played ?? 0,
    fixtures: []
  }));
}


function isConfiguredLeague(leagueName: string) {
  return leagueName.toLowerCase() === CONFIGURED_LEAGUE_NAME.toLowerCase();
}

function normalizeTeamName(teamName: string) {
  return teamName.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseHistoricalForm(form: string | undefined): Result[] {
  const parsed = (form ?? "")
    .slice(-5)
    .split("")
    .filter((value): value is Result => value === "W" || value === "D" || value === "L");

  return parsed.length > 0 ? parsed : ["D", "D", "D", "D", "D"];
}

function estimateHistoricalAttackRating(standing: LeagueHistoricalDossier["standings"][number]) {
  const played = standing.played || 38;
  return Math.max(0.7, Math.min(2.4, (standing.goalsFor ?? played) / played));
}

function estimateHistoricalDefenceRating(standing: LeagueHistoricalDossier["standings"][number]) {
  const played = standing.played || 38;
  return Math.max(0.7, Math.min(2.4, 2 - (standing.goalsAgainst ?? played) / played));
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

function getCurrentCoverageItems(): CoverageItem[] {
  return [
    { label: "Fixtures", enabled: true, note: "Loaded through provider/cache fallback." },
    { label: "Teams", enabled: true, note: "Current EPL roster is normalised locally." },
    { label: "Standings", enabled: false, note: "Requires plan-supported current-season API-Football coverage." },
    { label: "Lineups", enabled: false, note: "Planned via `/fixtures/lineups` once available." },
    { label: "Fixture stats", enabled: false, note: "Planned via `/fixtures/statistics`." },
    { label: "Player match stats", enabled: false, note: "Planned via `/fixtures/players`." },
    { label: "Injuries", enabled: false, note: "Planned via `/injuries`." },
    { label: "Transfers", enabled: true, note: "Available in team dossiers when provider returns data." },
    { label: "Odds", enabled: true, note: "Loaded separately from The Odds API." }
  ];
}

function getPlayerCoverageItems(): CoverageItem[] {
  return [
    { label: "Squad lists", enabled: true, note: "Available on team dossier where provider access allows." },
    { label: "Top scorers", enabled: true, note: "Historical league dossier already supports this." },
    { label: "Top assists", enabled: true, note: "Historical league dossier already supports this." },
    { label: "Player season stats", enabled: false, note: "Planned from `/players`." },
    { label: "Player match stats", enabled: false, note: "Planned from `/fixtures/players`." },
    { label: "Availability", enabled: false, note: "Planned from `/injuries` and lineup context." }
  ];
}

function flattenCoverage(coverage: NonNullable<LeagueHistoricalDossier["coverage"]>): CoverageItem[] {
  return [
    { label: "Standings", enabled: Boolean(coverage.standings) },
    { label: "Players", enabled: Boolean(coverage.players) },
    { label: "Top scorers", enabled: Boolean(coverage.topScorers) },
    { label: "Top assists", enabled: Boolean(coverage.topAssists) },
    { label: "Injuries", enabled: Boolean(coverage.injuries) },
    { label: "Predictions", enabled: Boolean(coverage.predictions) },
    { label: "Odds", enabled: Boolean(coverage.odds) },
    { label: "Events", enabled: Boolean(coverage.fixtures?.events) },
    { label: "Lineups", enabled: Boolean(coverage.fixtures?.lineups) },
    { label: "Fixture stats", enabled: Boolean(coverage.fixtures?.statisticsFixtures) },
    { label: "Player match stats", enabled: Boolean(coverage.fixtures?.statisticsPlayers) }
  ];
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-GB").format(value);
}
