import type { FixtureAnalysis } from "../../src/model/probability";
import type { Fixture } from "../../src/types";
import type { DatabaseConnection } from "../db/types";

const MODEL_VERSION = "edgefinder-goal-projection-v0";

export class OpportunitiesRepository {
  constructor(private readonly db: DatabaseConnection) {}

  upsertBestFixtureOpportunity(fixture: Fixture, analysis: FixtureAnalysis, capturedAt = Date.now()) {
    const market = analysis.bestMarket;
    const marketKey = getMarketKey(market.label, market.context);
    const status = getStatus(market.edge, market.marketOdds, analysis.confidence);
    const opportunityId = `opportunity:${fixture.id}:${marketKey}:${slug(market.label)}`;

    this.db.run(
      `INSERT INTO opportunities
        (id, fixture_id, market_key, selection, first_seen_at, latest_snapshot_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         latest_snapshot_at = excluded.latest_snapshot_at,
         status = excluded.status`,
      [opportunityId, fixture.id, marketKey, market.label, capturedAt, capturedAt, status]
    );

    this.db.run(
      `INSERT INTO opportunity_snapshots
        (id, opportunity_id, fixture_id, market_key, selection, model_probability, market_probability,
         fair_price, market_price, edge, confidence, status, model_version, inputs_json, captured_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `opportunity-snapshot:${opportunityId}:${capturedAt}`,
        opportunityId,
        fixture.id,
        marketKey,
        market.label,
        market.probability,
        market.marketOdds ? 1 / market.marketOdds : null,
        market.fairOdds,
        market.marketOdds ?? null,
        market.edge,
        analysis.confidence,
        status,
        MODEL_VERSION,
        JSON.stringify({
          homeExpectedGoals: analysis.homeExpectedGoals,
          awayExpectedGoals: analysis.awayExpectedGoals,
          over25Probability: analysis.over25Probability,
          bttsProbability: analysis.bttsProbability
        }),
        capturedAt
      ]
    );
  }
}

function getStatus(edge: number, marketOdds: number | undefined, confidence: FixtureAnalysis["confidence"]) {
  if (edge <= 0 || !marketOdds) return "no_edge";
  if (edge >= 0.06 && confidence !== "Low") return "candidate";
  return "watch";
}

function getMarketKey(label: string, context?: string) {
  return context ? `scorer:${slug(label)}` : slug(label);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

