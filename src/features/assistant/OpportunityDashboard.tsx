import { ArrowRight, Target } from "lucide-react";
import React from "react";
import { DataFreshnessChip } from "../../components/DataFreshnessChip";
import { Panel } from "../../components/Panel";
import { analyseFixture, formatPercent, type FixtureAnalysis } from "../../model/probability";
import type { Fixture } from "../../types";
import { matchesDateWindow } from "../../utils/fixtureFilters";
import { isFixtureFollowed } from "../../utils/follows";
import { formatKickoffTime } from "../../utils/formatting";
import { buildBetThesis, type BetThesis, type BetVerdictStatus } from "./thesis";

type OpportunityStatus = "candidate" | "watch" | "no_edge" | "stale";
type OpportunityFilter = "all" | "today" | "next24" | "weekend" | "following" | "high_confidence";

interface OpportunitySummary {
  id: string;
  fixtureId: string;
  fixtureLabel: string;
  league: string;
  fixture: Fixture;
  kickoff: string;
  marketKey: string;
  selection: string;
  price?: number;
  fairPrice: number;
  edge: number;
  confidence: FixtureAnalysis["confidence"];
  status: OpportunityStatus;
  thesis: BetThesis;
}

interface OpportunityDashboardProps {
  fixtures: Fixture[];
  selectedFixtureId: string;
  followedTeamIds: Set<string>;
  followedLeagues: Set<string>;
  onSelectFixture: (fixtureId: string) => void;
}

const MAX_OPPORTUNITIES = 5;

export function OpportunityDashboard({
  fixtures,
  selectedFixtureId,
  followedTeamIds,
  followedLeagues,
  onSelectFixture
}: OpportunityDashboardProps) {
  const [filter, setFilter] = React.useState<OpportunityFilter>("all");
  const opportunities = buildOpportunitySummaries(fixtures).filter((opportunity) =>
    matchesOpportunityFilter(opportunity, filter, followedTeamIds, followedLeagues)
  );
  const positiveEdges = opportunities.filter((opportunity) => opportunity.edge > 0);
  const visibleOpportunities = positiveEdges.slice(0, MAX_OPPORTUNITIES);

  return (
    <Panel title="Edge Dashboard" icon={<Target size={18} />} wide>
      <div className="edge-dashboard">
        <header className="edge-dashboard-header">
          <div>
            <strong>Top opportunities</strong>
            <span>Sorted by estimated model edge from the fixtures currently in your sidebar filters.</span>
          </div>
          <span className="edge-dashboard-count">
            {positiveEdges.length ? `${positiveEdges.length} positive` : "No positives"}
          </span>
        </header>

        <div className="opportunity-filters" aria-label="Opportunity filters">
          {OPPORTUNITY_FILTERS.map((item) => (
            <button
              className={filter === item.value ? "is-active" : ""}
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {visibleOpportunities.length ? (
          <div className="opportunity-table" aria-label="Top betting opportunities">
            <div className="opportunity-head">
              <span>Fixture</span>
              <span>Selection</span>
              <span>Edge / Status</span>
            </div>
            {visibleOpportunities.map((opportunity) => (
              <button
                className={opportunity.fixtureId === selectedFixtureId ? "opportunity-row is-selected" : "opportunity-row"}
                key={opportunity.id}
                type="button"
                onClick={() => onSelectFixture(opportunity.fixtureId)}
              >
                <span>
                  <strong>{opportunity.fixtureLabel}</strong>
                  <small>
                    {opportunity.league} | {formatKickoffTime(opportunity.kickoff)}
                  </small>
                </span>
                <span>
                  <strong>{opportunity.selection}</strong>
                  <small>
                    {opportunity.price ? `Market ${opportunity.price.toFixed(2)}` : "No live price"} | Fair{" "}
                    {opportunity.fairPrice.toFixed(2)}
                  </small>
                </span>
                <span className="opportunity-signal">
                  <strong className="opportunity-edge">+{formatPercent(opportunity.edge)}</strong>
                  <OpportunityStatusLabel status={opportunity.status} />
                  <small>
                    {opportunity.confidence} confidence <ArrowRight size={15} aria-hidden="true" />
                  </small>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="opportunity-empty">
            <strong>No candidate edges found for these filters.</strong>
            <span>Try widening the date range, including more leagues, or refreshing odds.</span>
          </div>
        )}

        <footer className="edge-dashboard-footer">
          <div className="trust-chip-row">
            <DataFreshnessChip quality="estimated" />
            <span className="trust-chip">Prototype model</span>
            <span className="trust-chip">Lineups unconfirmed</span>
            <span className="trust-chip">Partial data</span>
          </div>
        </footer>
      </div>
    </Panel>
  );
}

function OpportunityStatusLabel({ status }: { status: OpportunityStatus }) {
  return <span className={`opportunity-status ${status}`}>{getStatusLabel(status)}</span>;
}

function buildOpportunitySummaries(fixtures: Fixture[]): OpportunitySummary[] {
  return fixtures
    .map((fixture) => {
      const analysis = analyseFixture(fixture);
      const thesis = buildBetThesis(fixture, analysis);
      const status = mapThesisStatus(thesis.status);

      return {
        id: `${fixture.id}:${thesis.marketKey}`,
        fixtureId: fixture.id,
        fixtureLabel: `${fixture.home.name} v ${fixture.away.name}`,
        league: fixture.competition,
        fixture,
        kickoff: fixture.kickoff,
        marketKey: thesis.marketKey,
        selection: thesis.selection,
        price: thesis.currentPrice,
        fairPrice: thesis.fairPrice,
        edge: thesis.edge,
        confidence: thesis.confidence,
        status,
        thesis
      };
    })
    .sort((first, second) => second.edge - first.edge || first.kickoff.localeCompare(second.kickoff));
}

function mapThesisStatus(status: BetVerdictStatus): OpportunityStatus {
  return status === "no_edge" ? "no_edge" : status;
}

function getStatusLabel(status: OpportunityStatus) {
  if (status === "candidate") return "Candidate";
  if (status === "watch") return "Watch";
  if (status === "stale") return "Stale";
  return "No clear edge";
}

function matchesOpportunityFilter(
  opportunity: OpportunitySummary,
  filter: OpportunityFilter,
  followedTeamIds: Set<string>,
  followedLeagues: Set<string>
) {
  if (filter === "today") return matchesDateWindow(opportunity.fixture, "today");
  if (filter === "next24") return matchesDateWindow(opportunity.fixture, "next24");
  if (filter === "weekend") return matchesDateWindow(opportunity.fixture, "weekend");
  if (filter === "following") return isFixtureFollowed(opportunity.fixture, followedTeamIds, followedLeagues);
  if (filter === "high_confidence") return opportunity.confidence === "High";
  return true;
}

const OPPORTUNITY_FILTERS: Array<{ label: string; value: OpportunityFilter }> = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "24h", value: "next24" },
  { label: "Weekend", value: "weekend" },
  { label: "Following", value: "following" },
  { label: "High confidence", value: "high_confidence" }
];
