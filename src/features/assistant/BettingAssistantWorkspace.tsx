import { Activity, Database, Goal, ShieldCheck, Target, TrendingUp } from "lucide-react";
import { FollowToggle } from "../../components/FollowToggle";
import { LogoMark } from "../../components/LogoMark";
import { Metric } from "../../components/Metric";
import { Panel } from "../../components/Panel";
import { formatPercent, type FixtureAnalysis } from "../../model/probability";
import type { CacheEvent } from "../../providers/cachedProvider";
import type { Fixture, MarketSelection, TeamSnapshot } from "../../types";
import { getTeamLogoUrl } from "../../utils/teamAssets";

interface BettingAssistantWorkspaceProps {
  selected: Fixture;
  analysis: FixtureAnalysis;
  cacheEvent?: CacheEvent;
  selectedIsFollowed: boolean;
  followedLeagues: Set<string>;
  followedTeamIds: Set<string>;
  onToggleLeague: (league: string) => void;
  onToggleTeam: (team: TeamSnapshot) => void;
}

export function BettingAssistantWorkspace({
  selected,
  analysis,
  cacheEvent,
  selectedIsFollowed,
  followedLeagues,
  followedTeamIds,
  onToggleLeague,
  onToggleTeam
}: BettingAssistantWorkspaceProps) {
  return (
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
          onClick={() => onToggleLeague(selected.competition)}
        />
        <FollowToggle
          label={selected.home.name}
          eyebrow="Team"
          active={followedTeamIds.has(selected.home.id)}
          onClick={() => onToggleTeam(selected.home)}
        />
        <FollowToggle
          label={selected.away.name}
          eyebrow="Team"
          active={followedTeamIds.has(selected.away.id)}
          onClick={() => onToggleTeam(selected.away)}
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
                <small>
                  xG {match.homeXg.toFixed(1)}-{match.awayXg.toFixed(1)}
                </small>
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
        This is a decision-support model, not betting advice. Treat probabilities as estimates, compare them to available
        odds, and only stake money you can afford to lose.
      </footer>
    </section>
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
