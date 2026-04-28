import type { DatabaseConnection } from "./types";

interface Migration {
  id: string;
  statements: string[];
}

const MIGRATIONS: Migration[] = [
  {
    id: "001_normalized_core",
    statements: [
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS provider_requests (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        request_key TEXT NOT NULL,
        status TEXT NOT NULL,
        source TEXT,
        error TEXT,
        requested_at INTEGER NOT NULL,
        response_ref TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_provider_requests_provider_endpoint
        ON provider_requests (provider, endpoint, requested_at)`,
      `CREATE TABLE IF NOT EXISTS leagues (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        provider_league_id TEXT,
        name TEXT NOT NULL,
        logo_url TEXT,
        country TEXT,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_leagues_provider_id
        ON leagues (provider, provider_league_id)`,
      `CREATE TABLE IF NOT EXISTS league_seasons (
        id TEXT PRIMARY KEY,
        league_id TEXT NOT NULL,
        season INTEGER NOT NULL,
        is_current INTEGER NOT NULL DEFAULT 0,
        coverage_json TEXT,
        data_status TEXT NOT NULL DEFAULT 'unknown',
        archived_at INTEGER,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (league_id) REFERENCES leagues(id)
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_league_seasons_league_season
        ON league_seasons (league_id, season)`,
      `CREATE TABLE IF NOT EXISTS venues (
        id TEXT PRIMARY KEY,
        provider TEXT,
        provider_venue_id TEXT,
        name TEXT NOT NULL,
        city TEXT,
        capacity INTEGER,
        surface TEXT,
        image_url TEXT,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_provider_id
        ON venues (provider, provider_venue_id)`,
      `CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        provider_team_id TEXT,
        name TEXT NOT NULL,
        logo_url TEXT,
        country TEXT,
        founded INTEGER,
        venue_id TEXT,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (venue_id) REFERENCES venues(id)
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_provider_id
        ON teams (provider, provider_team_id)`,
      `CREATE TABLE IF NOT EXISTS fixtures (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        provider_fixture_id TEXT,
        league_id TEXT,
        season INTEGER,
        kickoff TEXT NOT NULL,
        status TEXT,
        venue_id TEXT,
        home_team_id TEXT NOT NULL,
        away_team_id TEXT NOT NULL,
        home_goals INTEGER,
        away_goals INTEGER,
        source_json TEXT,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (league_id) REFERENCES leagues(id),
        FOREIGN KEY (venue_id) REFERENCES venues(id),
        FOREIGN KEY (home_team_id) REFERENCES teams(id),
        FOREIGN KEY (away_team_id) REFERENCES teams(id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_fixtures_kickoff ON fixtures (kickoff)`,
      `CREATE INDEX IF NOT EXISTS idx_fixtures_league_season ON fixtures (league_id, season)`,
      `CREATE TABLE IF NOT EXISTS fixture_teams (
        fixture_id TEXT NOT NULL,
        team_id TEXT NOT NULL,
        side TEXT NOT NULL,
        PRIMARY KEY (fixture_id, team_id, side),
        FOREIGN KEY (fixture_id) REFERENCES fixtures(id),
        FOREIGN KEY (team_id) REFERENCES teams(id)
      )`,
      `CREATE TABLE IF NOT EXISTS odds_events (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        provider_event_id TEXT NOT NULL,
        sport_key TEXT NOT NULL,
        sport_title TEXT,
        fixture_id TEXT,
        home_team TEXT NOT NULL,
        away_team TEXT NOT NULL,
        commence_time TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (fixture_id) REFERENCES fixtures(id)
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_odds_events_provider_event
        ON odds_events (provider, provider_event_id)`,
      `CREATE TABLE IF NOT EXISTS odds_snapshots (
        id TEXT PRIMARY KEY,
        odds_event_id TEXT NOT NULL,
        fixture_id TEXT,
        bookmaker_key TEXT NOT NULL,
        bookmaker_title TEXT,
        market_key TEXT NOT NULL,
        outcome_name TEXT NOT NULL,
        outcome_point REAL,
        price REAL NOT NULL,
        last_update TEXT,
        captured_at INTEGER NOT NULL,
        FOREIGN KEY (odds_event_id) REFERENCES odds_events(id),
        FOREIGN KEY (fixture_id) REFERENCES fixtures(id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_odds_snapshots_fixture_market
        ON odds_snapshots (fixture_id, market_key, captured_at)`,
      `CREATE TABLE IF NOT EXISTS opportunities (
        id TEXT PRIMARY KEY,
        fixture_id TEXT NOT NULL,
        market_key TEXT NOT NULL,
        selection TEXT NOT NULL,
        first_seen_at INTEGER NOT NULL,
        latest_snapshot_at INTEGER NOT NULL,
        status TEXT NOT NULL,
        FOREIGN KEY (fixture_id) REFERENCES fixtures(id)
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunities_fixture_market_selection
        ON opportunities (fixture_id, market_key, selection)`,
      `CREATE TABLE IF NOT EXISTS opportunity_snapshots (
        id TEXT PRIMARY KEY,
        opportunity_id TEXT NOT NULL,
        fixture_id TEXT NOT NULL,
        market_key TEXT NOT NULL,
        selection TEXT NOT NULL,
        model_probability REAL NOT NULL,
        market_probability REAL,
        fair_price REAL NOT NULL,
        market_price REAL,
        edge REAL NOT NULL,
        confidence TEXT NOT NULL,
        status TEXT NOT NULL,
        model_version TEXT NOT NULL,
        inputs_json TEXT,
        captured_at INTEGER NOT NULL,
        FOREIGN KEY (opportunity_id) REFERENCES opportunities(id),
        FOREIGN KEY (fixture_id) REFERENCES fixtures(id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_opportunity_snapshots_fixture
        ON opportunity_snapshots (fixture_id, captured_at)`
    ]
  },
  {
    id: "002_season_research_data",
    statements: [
      `CREATE TABLE IF NOT EXISTS season_data_status (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        league_id TEXT,
        season INTEGER NOT NULL,
        requested_season INTEGER NOT NULL,
        resolved_season INTEGER NOT NULL,
        fallback_season_used INTEGER NOT NULL DEFAULT 0,
        source TEXT NOT NULL,
        completeness TEXT NOT NULL,
        missing_data_json TEXT,
        errors_json TEXT,
        archive_eligible INTEGER NOT NULL DEFAULT 0,
        refreshed_at TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_season_data_status_entity
        ON season_data_status (entity_type, entity_id, league_id, season)` ,
      `CREATE TABLE IF NOT EXISTS league_standings (
        id TEXT PRIMARY KEY,
        league_id TEXT NOT NULL,
        season INTEGER NOT NULL,
        rank INTEGER NOT NULL,
        team_id TEXT NOT NULL,
        team_name TEXT NOT NULL,
        team_logo_url TEXT,
        played INTEGER,
        wins INTEGER,
        draws INTEGER,
        losses INTEGER,
        goals_for INTEGER,
        goals_against INTEGER,
        goal_difference INTEGER,
        points INTEGER,
        form TEXT,
        source_json TEXT,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_league_standings_team
        ON league_standings (league_id, season, team_id)` ,
      `CREATE INDEX IF NOT EXISTS idx_league_standings_rank
        ON league_standings (league_id, season, rank)` ,
      `CREATE TABLE IF NOT EXISTS league_player_rankings (
        id TEXT PRIMARY KEY,
        league_id TEXT NOT NULL,
        season INTEGER NOT NULL,
        ranking_type TEXT NOT NULL,
        rank INTEGER NOT NULL,
        player_id TEXT NOT NULL,
        player_name TEXT NOT NULL,
        player_photo_url TEXT,
        team_id TEXT,
        team_name TEXT,
        goals INTEGER,
        assists INTEGER,
        appearances INTEGER,
        minutes INTEGER,
        source_json TEXT,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_league_player_rankings_player
        ON league_player_rankings (league_id, season, ranking_type, player_id)` ,
      `CREATE INDEX IF NOT EXISTS idx_league_player_rankings_rank
        ON league_player_rankings (league_id, season, ranking_type, rank)` ,
      `CREATE TABLE IF NOT EXISTS team_season_statistics (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        league_id TEXT NOT NULL,
        season INTEGER NOT NULL,
        statistics_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_team_season_statistics_team
        ON team_season_statistics (team_id, league_id, season)` ,
      `CREATE TABLE IF NOT EXISTS team_season_players (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        league_id TEXT NOT NULL,
        season INTEGER NOT NULL,
        player_id TEXT NOT NULL,
        player_name TEXT NOT NULL,
        age INTEGER,
        number INTEGER,
        position TEXT,
        photo_url TEXT,
        appearances INTEGER,
        lineups INTEGER,
        minutes INTEGER,
        goals INTEGER,
        assists INTEGER,
        source_json TEXT,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_team_season_players_player
        ON team_season_players (team_id, league_id, season, player_id)` ,
      `CREATE TABLE IF NOT EXISTS team_transfers (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        season INTEGER NOT NULL,
        player_name TEXT NOT NULL,
        transfer_date TEXT,
        transfer_type TEXT,
        in_team_name TEXT,
        out_team_name TEXT,
        direction TEXT NOT NULL,
        source_json TEXT,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_team_transfers_team_season
        ON team_transfers (team_id, season, transfer_date)` ,
      `CREATE TABLE IF NOT EXISTS fixture_lineups (
        id TEXT PRIMARY KEY,
        fixture_id TEXT NOT NULL,
        team_id TEXT NOT NULL,
        formation TEXT,
        lineup_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_fixture_lineups_fixture_team
        ON fixture_lineups (fixture_id, team_id)`
    ]
  }
];

export function runMigrations(db: DatabaseConnection) {
  ensureMigrationTable(db);
  const applied = new Set(db.query<{ id: string }>("SELECT id FROM schema_migrations").map((row) => row.id));

  MIGRATIONS.forEach((migration) => {
    if (applied.has(migration.id)) return;

    db.transaction(() => {
      db.runMany(migration.statements);
      db.run("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)", [migration.id, Date.now()]);
    });
  });
}

function ensureMigrationTable(db: DatabaseConnection) {
  db.runMany([
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )`
  ]);
}

