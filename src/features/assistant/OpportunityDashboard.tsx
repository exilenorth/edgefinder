import { ArrowRight, Target } from "lucide-react";
import { DataFreshnessChip } from "../../components/DataFreshnessChip";
import { Panel } from "../../components/Panel";
import { analyseFixture, formatPercent, type FixtureAnalysis } from "../../model/probability";
import type { Fixture } from "../../types";
import { formatKickoffTime } from "../../utils/formatting";
import { buildBetThesis, type BetThesis, type BetVerdictStatus } from "./thesis";

type OpportunityStatus = "playable" | "watch" | "no_edge" | "stale";

interface OpportunitySummary {
  id: string;
  fixtureId: string;
  fixtureLabel: string;
  league: string;
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
  onSelectFixture: (fixtureId: string) => void;
}

const MAX_OPPORTUNITIES = 5;

export function OpportunityDashboard({ fixtures, selectedFixtureId, onSelectFixture }: OpportunityDashboardProps) {
  const opportunities = buildOpportunitySummaries(fixtures);
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

        {visibleOpportunities.length ? (
          <div className="opportunity-table" aria-label="Top betting opportunities">
            <div className="opportunity-head">
              <span>Fixture</span>
              <span>Market</span>
              <span>Edge</span>
              <span>Confidence</span>
              <span>Status</span>
              <span>Kickoff</span>
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
                  <small>{opportunity.league}</small>
                </span>
                <span>
                  <strong>{opportunity.selection}</strong>
                  <small>
                    {opportunity.price ? `Price ${opportunity.price.toFixed(2)}` : "Needs live price"} | Fair{" "}
                    {opportunity.fairPrice.toFixed(2)}
                  </small>
                </span>
                <span className="opportunity-edge">+{formatPercent(opportunity.edge)}</span>
                <span>{opportunity.confidence}</span>
                <span>
                  <OpportunityStatusLabel status={opportunity.status} />
                </span>
                <span className="opportunity-kickoff">
                  {formatKickoffTime(opportunity.kickoff)}
                  <ArrowRight size={15} aria-hidden="true" />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="opportunity-empty">
            <strong>No positive edges found for the current filters.</strong>
            <span>Try widening the date range or checking back after odds refresh.</span>
          </div>
        )}

        <footer className="edge-dashboard-footer">
          <DataFreshnessChip quality="estimated" />
          <span>Dashboard rankings use the current prototype model and attached market prices.</span>
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
  if (status === "playable") return "Playable";
  if (status === "watch") return "Watch";
  if (status === "stale") return "Stale";
  return "No edge";
}
