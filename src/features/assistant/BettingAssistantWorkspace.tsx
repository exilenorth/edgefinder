import { Activity, Database, Goal, ShieldCheck, Target, TrendingUp } from "lucide-react";
import type React from "react";
import { FollowToggle } from "../../components/FollowToggle";
import { LogoMark } from "../../components/LogoMark";
import { Metric } from "../../components/Metric";
import { formatPercent, type FixtureAnalysis } from "../../model/probability";
import type { CacheEvent } from "../../providers/cachedProvider";
import type { Fixture, MarketSelection, TeamSnapshot } from "../../types";
import { getTeamLogoUrl } from "../../utils/teamAssets";
import { BetThesisPanel } from "./BetThesisPanel";
import { OpportunityDashboard } from "./OpportunityDashboard";
import { CounterargumentPanel, ReasonsPanel, RiskFlagsPanel } from "./ReasoningPanels";
import { buildBetThesis } from "./thesis";

interface BettingAssistantWorkspaceProps {
  selected: Fixture;
  fixtures: Fixture[];
  analysis: FixtureAnalysis;
  cacheEvent?: CacheEvent;
  selectedIsFollowed: boolean;
  followedLeagues: Set<string>;
  followedTeamIds: Set<string>;
  onSelectFixture: (fixtureId: string) => void;
  onToggleLeague: (league: string) => void;
  onToggleTeam: (team: TeamSnapshot) => void;
  onOpenResearchLeague: (league: string) => void;
  onOpenResearchTeam: (team: TeamSnapshot) => void;
}

export function BettingAssistantWorkspace({
  selected,
  fixtures,
  analysis,
  cacheEvent,
  selectedIsFollowed,
  followedLeagues,
  followedTeamIds,
  onSelectFixture,
  onToggleLeague,
  onToggleTeam,
  onOpenResearchLeague,
  onOpenResearchTeam
}: BettingAssistantWorkspaceProps) {
  const thesis = buildBetThesis(selected, analysis, cacheEvent);

  return (
    <section className="workspace">
      <OpportunityDashboard
        fixtures={fixtures}
        selectedFixtureId={selected.id}
        followedTeamIds={followedTeamIds}
        followedLeagues={followedLeagues}
        onSelectFixture={onSelectFixture}
      />

      <header className="match-header">
        <div>
          <button className="eyebrow-link" type="button" onClick={() => onOpenResearchLeague(selected.competition)}>
            {selected.competition}
          </button>
          <h1>
            <button className="entity-link" type="button" onClick={() => onOpenResearchTeam(selected.home)}>
              <LogoMark src={getTeamLogoUrl(selected.home)} label={selected.home.name} />
              {selected.home.name}
            </button>
            <span>vs</span>
            <button className="entity-link" type="button" onClick={() => onOpenResearchTeam(selected.away)}>
              {selected.away.name}
              <LogoMark src={getTeamLogoUrl(selected.away)} label={selected.away.name} />
            </button>
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
      </header>

      <section className="decision-grid" aria-label="Assistant decision summary">
        <BetThesisPanel thesis={thesis} />
        <ReasonsPanel thesis={thesis} />
        <RiskFlagsPanel thesis={thesis} />
        <CounterargumentPanel thesis={thesis} />
      </section>

      <section className="score-strip" aria-label="Result probabilities">
        {analysis.resultMarkets.map((market) => (
          <ProbabilityTile selection={market} key={market.label} />
        ))}
      </section>

      <section className="dashboard-grid">
        <EvidencePanel title="Team Form" icon={<TrendingUp size={18} />}>
          <TeamForm fixture={selected} />
        </EvidencePanel>

        <EvidencePanel title="Goal Projection" icon={<Target size={18} />}>
          <div className="xg-grid">
            <Metric label={`${selected.home.name} projected goals`} value={analysis.homeExpectedGoals.toFixed(2)} />
            <Metric label={`${selected.away.name} projected goals`} value={analysis.awayExpectedGoals.toFixed(2)} />
            <Metric label="Both teams score" value={formatPercent(analysis.bttsProbability)} />
            <Metric label="Over 2.5 goals" value={formatPercent(analysis.over25Probability)} />
          </div>
        </EvidencePanel>

        <EvidencePanel title="Head To Head" icon={<ShieldCheck size={18} />}>
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
        </EvidencePanel>

        <EvidencePanel title="Likely Scorelines" icon={<Goal size={18} />}>
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
        </EvidencePanel>

        <EvidencePanel title="Anytime Scorers" icon={<Activity size={18} />} wide>
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
        </EvidencePanel>
      </section>

      <section className="track-panel" aria-label="Track this fixture">
        <div>
          <p>Track this</p>
          <h2>Follow the league or teams behind this opportunity.</h2>
        </div>
        <div className="follow-panel compact">
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
        </div>
      </section>

      <footer className="note">
        This is a decision-support model, not betting advice. Treat probabilities as estimates, compare them to available
        odds, and only stake money you can afford to lose.
      </footer>
    </section>
  );
}

function EvidencePanel({
  title,
  icon,
  wide,
  children
}: {
  title: string;
  icon: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className={wide ? "evidence-panel wide" : "evidence-panel"}>
      <summary>
        <span>
          {icon}
          {title}
        </span>
        <small>Open evidence</small>
      </summary>
      <div className="evidence-panel-body">{children}</div>
    </details>
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
