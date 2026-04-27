import type { DataQuality } from "../../components/DataFreshnessChip";
import type { FixtureAnalysis, ModelConfidence } from "../../model/probability";
import type { CacheEvent } from "../../providers/cachedProvider";
import type { Fixture, MarketSelection } from "../../types";

export type BetVerdictStatus = "playable" | "watch" | "no_edge";

const PLAYABLE_EDGE_THRESHOLD = 0.06;
const SMALL_EDGE_THRESHOLD = 0.04;
const GOAL_GAP_REASON_THRESHOLD = 0.4;
const OPEN_GAME_TOTAL_GOALS_THRESHOLD = 2.7;

export interface BetThesis {
  fixtureId: string;
  marketKey: string;
  selection: string;
  currentPrice?: number;
  fairPrice: number;
  modelProbability: number;
  marketProbability?: number;
  edge: number;
  confidence: ModelConfidence;
  dataQuality: DataQuality;
  status: BetVerdictStatus;
  verdict: string;
  reasons: string[];
  risks: string[];
  counterArguments: string[];
}

export function buildBetThesis(fixture: Fixture, analysis: FixtureAnalysis, cacheEvent?: CacheEvent): BetThesis {
  const market = analysis.bestMarket;
  const dataQuality = getDataQuality(cacheEvent, market);
  const status = getVerdictStatus(market, analysis.confidence, dataQuality);
  const marketProbability = market.marketOdds ? 1 / market.marketOdds : undefined;

  return {
    fixtureId: fixture.id,
    marketKey: getMarketKey(market),
    selection: market.label,
    currentPrice: market.marketOdds,
    fairPrice: market.fairOdds,
    modelProbability: market.probability,
    marketProbability,
    edge: market.edge,
    confidence: analysis.confidence,
    dataQuality,
    status,
    verdict: getVerdictCopy(status, market, dataQuality),
    reasons: buildReasons(fixture, analysis, market),
    risks: buildRisks(fixture, analysis, market, dataQuality, cacheEvent),
    counterArguments: buildCounterArguments(fixture, analysis, market)
  };
}

function getVerdictStatus(market: MarketSelection, confidence: ModelConfidence, dataQuality: DataQuality): BetVerdictStatus {
  if (market.edge <= 0 || !market.marketOdds) return "no_edge";
  if (dataQuality === "unavailable") return "no_edge";
  if (market.edge >= PLAYABLE_EDGE_THRESHOLD && confidence !== "Low" && dataQuality !== "estimated") return "playable";
  return "watch";
}

function getVerdictCopy(status: BetVerdictStatus, market: MarketSelection, dataQuality: DataQuality) {
  if (status === "playable") {
    return `${market.label} is the strongest current angle, but only while the available price stays close to or above ${market.fairOdds.toFixed(2)}.`;
  }

  if (status === "watch") {
    const sourceCaveat = dataQuality === "estimated" ? " because key inputs are still estimated" : "";
    return `${market.label} is worth investigating${sourceCaveat}, but the confidence or price cushion is not strong enough for a clean green light yet.`;
  }

  if (!market.marketOdds) {
    return "No clear positive edge can be confirmed because this selection does not currently have a market price attached.";
  }

  return "No clear positive edge is showing from the current estimated markets.";
}

function buildReasons(fixture: Fixture, analysis: FixtureAnalysis, market: MarketSelection) {
  const expectedGoalGap = analysis.homeExpectedGoals - analysis.awayExpectedGoals;
  const strongerTeam = expectedGoalGap >= 0 ? fixture.home : fixture.away;
  const totalProjectedGoals = analysis.homeExpectedGoals + analysis.awayExpectedGoals;
  const reasons = [
    market.edge > 0 && market.marketOdds
      ? `Estimated model probability is ${(market.edge * 100).toFixed(1)} percentage points above the attached market's implied probability.`
      : "The selected market is the best available model angle, but it cannot be treated as value without a confirmed positive price gap.",
    `${fixture.home.name} ${analysis.homeExpectedGoals.toFixed(2)}-${analysis.awayExpectedGoals.toFixed(2)} ${fixture.away.name} is the current goal projection.`
  ];

  if (Math.abs(expectedGoalGap) >= GOAL_GAP_REASON_THRESHOLD) {
    reasons.push(`${strongerTeam.name} profile as the stronger side in the current attack/defence blend.`);
  }

  if (totalProjectedGoals >= OPEN_GAME_TOTAL_GOALS_THRESHOLD) {
    reasons.push("The goal model leans toward an open game, which supports goal and scorer-related markets.");
  }

  if (market.context) {
    reasons.push(`${market.label} carries the strongest player-level scoring angle in the available starter assumptions.`);
  }

  return reasons.slice(0, 4);
}

function buildRisks(
  fixture: Fixture,
  analysis: FixtureAnalysis,
  market: MarketSelection,
  dataQuality: DataQuality,
  cacheEvent?: CacheEvent
) {
  const risks = [
    "Lineups are not confirmed in this prototype view, so starter assumptions can move the fair price.",
    "Current-season provider coverage is limited on the configured API-Football plan, so some inputs are estimated or cached."
  ];

  if (analysis.confidence === "Low") {
    risks.push("Model confidence is low because the available evidence set is thin.");
  }

  if (!market.marketOdds) {
    risks.push("No live market price is attached to this selection, so the edge cannot be validated against a bookmaker quote.");
  }

  if (dataQuality === "estimated") {
    risks.push("This thesis uses estimated inputs, so treat the edge as a prompt for research rather than a playable signal.");
  }

  if (cacheEvent?.status === "hit") {
    risks.push("The fixture was loaded from cache; prices or team news may have moved since refresh.");
  }

  if (fixture.headToHead.length < 3) {
    risks.push("Head-to-head evidence is limited and should not be over-weighted.");
  }

  return risks.slice(0, 5);
}

function buildCounterArguments(fixture: Fixture, analysis: FixtureAnalysis, market: MarketSelection) {
  const counterArguments = [
    "The market may already have priced in recent form and team strength.",
    "This is a projection model, not shot-location xG, so chance quality is approximated rather than measured directly."
  ];

  if (market.edge < SMALL_EDGE_THRESHOLD) {
    counterArguments.push("The edge cushion is small enough that normal bookmaker movement could erase it.");
  }

  if (analysis.bttsProbability < 0.5) {
    counterArguments.push("Both-teams-to-score probability is not especially high, which can dampen goal-market confidence.");
  }

  if (fixture.home.form.results.includes("L") || fixture.away.form.results.includes("L")) {
    counterArguments.push("Recent form contains volatility, so the result path may be less stable than the headline edge suggests.");
  }

  return counterArguments.slice(0, 4);
}

function getDataQuality(cacheEvent: CacheEvent | undefined, market: MarketSelection): DataQuality {
  if (!market.marketOdds) return "estimated";
  if (!cacheEvent) return "estimated";
  return cacheEvent.status === "hit" ? "cached" : "partial";
}

function getMarketKey(market: MarketSelection) {
  return market.context ? `scorer:${market.label}` : market.label.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}
