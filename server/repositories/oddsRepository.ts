import type { Fixture } from "../../src/types";
import type { OddsApiEvent } from "../../src/providers/theOddsApiClient";
import type { DatabaseConnection } from "../db/types";

export class OddsRepository {
  constructor(private readonly db: DatabaseConnection) {}

  upsertOddsEvent(event: OddsApiEvent, fixtureId?: string, capturedAt = Date.now()) {
    const id = `the-odds-api:event:${event.id}`;
    this.db.run(
      `INSERT INTO odds_events
        (id, provider, provider_event_id, sport_key, sport_title, fixture_id, home_team, away_team, commence_time, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         sport_key = excluded.sport_key,
         sport_title = excluded.sport_title,
         fixture_id = COALESCE(excluded.fixture_id, odds_events.fixture_id),
         home_team = excluded.home_team,
         away_team = excluded.away_team,
         commence_time = excluded.commence_time,
         updated_at = excluded.updated_at`,
      [
        id,
        "the-odds-api",
        event.id,
        event.sport_key,
        event.sport_title,
        fixtureId ?? null,
        event.home_team,
        event.away_team,
        event.commence_time,
        capturedAt
      ]
    );

    event.bookmakers?.forEach((bookmaker) => {
      bookmaker.markets.forEach((market) => {
        market.outcomes.forEach((outcome) => {
          this.db.run(
            `INSERT INTO odds_snapshots
              (id, odds_event_id, fixture_id, bookmaker_key, bookmaker_title, market_key, outcome_name,
               outcome_point, price, last_update, captured_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              [
                "odds-snapshot",
                event.id,
                bookmaker.key,
                market.key,
                outcome.name,
                outcome.point ?? "none",
                capturedAt
              ].join(":"),
              id,
              fixtureId ?? null,
              bookmaker.key,
              bookmaker.title,
              market.key,
              outcome.name,
              outcome.point ?? null,
              outcome.price,
              market.last_update ?? bookmaker.last_update,
              capturedAt
            ]
          );
        });
      });
    });
  }

  recordFixtureMarketOdds(fixture: Fixture, capturedAt = Date.now()) {
    const eventId = `fixture-market:${fixture.id}`;
    this.db.run(
      `INSERT INTO odds_events
        (id, provider, provider_event_id, sport_key, sport_title, fixture_id, home_team, away_team, commence_time, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         fixture_id = excluded.fixture_id,
         home_team = excluded.home_team,
         away_team = excluded.away_team,
         commence_time = excluded.commence_time,
         updated_at = excluded.updated_at`,
      [
        eventId,
        "edgefinder",
        fixture.id,
        "fixture-snapshot",
        fixture.competition,
        fixture.id,
        fixture.home.name,
        fixture.away.name,
        fixture.kickoff,
        capturedAt
      ]
    );

    const outcomes = [
      { market: "h2h", name: fixture.home.name, price: fixture.marketOdds.home },
      { market: "h2h", name: "Draw", price: fixture.marketOdds.draw },
      { market: "h2h", name: fixture.away.name, price: fixture.marketOdds.away },
      { market: "totals", name: "Over", point: 2.5, price: fixture.marketOdds.over25 },
      { market: "btts", name: "Yes", price: fixture.marketOdds.btts }
    ].filter((outcome): outcome is { market: string; name: string; point?: number; price: number } => typeof outcome.price === "number");

    outcomes.forEach((outcome) => {
      this.db.run(
        `INSERT INTO odds_snapshots
          (id, odds_event_id, fixture_id, bookmaker_key, bookmaker_title, market_key, outcome_name,
           outcome_point, price, last_update, captured_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          [
            "fixture-odds-snapshot",
            fixture.id,
            outcome.market,
            outcome.name,
            outcome.point ?? "none",
            capturedAt
          ].join(":"),
          eventId,
          fixture.id,
          "attached-market",
          "Attached market",
          outcome.market,
          outcome.name,
          outcome.point ?? null,
          outcome.price,
          null,
          capturedAt
        ]
      );
    });
  }

  listFixtureOddsMovement(fixtureId: string) {
    const rows = this.db.query<OddsSnapshotRow>(
      `SELECT
         bookmaker_key,
         bookmaker_title,
         market_key,
         outcome_name,
         outcome_point,
         price,
         last_update,
         captured_at
       FROM odds_snapshots
       WHERE fixture_id = ?
       ORDER BY market_key, outcome_name, bookmaker_key, captured_at ASC`,
      [fixtureId]
    );

    const grouped = new Map<string, OddsSnapshotRow[]>();
    rows.forEach((row) => {
      const key = [row.bookmaker_key, row.market_key, row.outcome_name, row.outcome_point ?? "none"].join(":");
      grouped.set(key, [...(grouped.get(key) ?? []), row]);
    });

    return Array.from(grouped.values())
      .map((snapshots) => {
        const first = snapshots[0];
        const latest = snapshots[snapshots.length - 1];
        return {
          bookmakerKey: latest.bookmaker_key,
          bookmakerTitle: latest.bookmaker_title,
          marketKey: latest.market_key,
          outcomeName: latest.outcome_name,
          outcomePoint: latest.outcome_point,
          firstPrice: first.price,
          latestPrice: latest.price,
          priceChange: Number((latest.price - first.price).toFixed(4)),
          firstCapturedAt: first.captured_at,
          latestCapturedAt: latest.captured_at,
          snapshotCount: snapshots.length,
          lastUpdate: latest.last_update
        };
      })
      .sort((first, second) => first.marketKey.localeCompare(second.marketKey) || first.outcomeName.localeCompare(second.outcomeName));
  }
}

interface OddsSnapshotRow extends Record<string, unknown> {
  bookmaker_key: string;
  bookmaker_title: string | null;
  market_key: string;
  outcome_name: string;
  outcome_point: number | null;
  price: number;
  last_update: string | null;
  captured_at: number;
}

