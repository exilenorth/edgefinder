import type { LeagueHistoricalDossier, TeamDossier } from "../../src/types";
import type { DatabaseConnection } from "../db/types";

export class SeasonResearchRepository {
  constructor(private readonly db: DatabaseConnection) {}

  upsertLeagueHistoricalDossier(dossier: LeagueHistoricalDossier) {
    const now = Date.now();
    const leagueId = String(dossier.league.id);
    const season = dossier.dataStatus.resolvedSeason ?? dossier.league.season;

    this.db.transaction(() => {
      this.upsertStatus("league", leagueId, leagueId, season, dossier.dataStatus, now);

      dossier.standings.forEach((standing) => {
        this.db.run(
          `INSERT INTO league_standings (
            id, league_id, season, rank, team_id, team_name, team_logo_url, played, wins, draws, losses,
            goals_for, goals_against, goal_difference, points, form, source_json, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(league_id, season, team_id) DO UPDATE SET
            rank = excluded.rank,
            team_name = excluded.team_name,
            team_logo_url = excluded.team_logo_url,
            played = excluded.played,
            wins = excluded.wins,
            draws = excluded.draws,
            losses = excluded.losses,
            goals_for = excluded.goals_for,
            goals_against = excluded.goals_against,
            goal_difference = excluded.goal_difference,
            points = excluded.points,
            form = excluded.form,
            source_json = excluded.source_json,
            updated_at = excluded.updated_at`,
          [
            `league:${leagueId}:season:${season}:standing:${standing.teamId}`,
            leagueId,
            season,
            standing.rank,
            String(standing.teamId),
            standing.team,
            standing.logo ?? null,
            standing.played ?? null,
            standing.wins ?? null,
            standing.draws ?? null,
            standing.losses ?? null,
            standing.goalsFor ?? null,
            standing.goalsAgainst ?? null,
            standing.goalDifference ?? null,
            standing.points ?? null,
            standing.form ?? null,
            JSON.stringify(standing),
            now
          ]
        );
      });

      this.upsertRankings(leagueId, season, "top_scorers", dossier.topScorers, now);
      this.upsertRankings(leagueId, season, "top_assists", dossier.topAssists, now);
    });
  }

  upsertTeamDossier(dossier: TeamDossier) {
    const now = Date.now();
    const teamId = String(dossier.team.id);
    const leagueId = String(dossier.league.id);
    const season = dossier.dataStatus.resolvedSeason ?? dossier.league.season;

    this.db.transaction(() => {
      this.upsertStatus("team", teamId, leagueId, season, dossier.dataStatus, now);

      if (dossier.statistics) {
        this.db.run(
          `INSERT INTO team_season_statistics (id, team_id, league_id, season, statistics_json, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(team_id, league_id, season) DO UPDATE SET
            statistics_json = excluded.statistics_json,
            updated_at = excluded.updated_at`,
          [`team:${teamId}:league:${leagueId}:season:${season}:statistics`, teamId, leagueId, season, JSON.stringify(dossier.statistics), now]
        );
      }

      dossier.squad.forEach((player) => {
        this.db.run(
          `INSERT INTO team_season_players (
            id, team_id, league_id, season, player_id, player_name, age, number, position, photo_url,
            appearances, lineups, minutes, goals, assists, source_json, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(team_id, league_id, season, player_id) DO UPDATE SET
            player_name = excluded.player_name,
            age = excluded.age,
            number = excluded.number,
            position = excluded.position,
            photo_url = excluded.photo_url,
            appearances = excluded.appearances,
            lineups = excluded.lineups,
            minutes = excluded.minutes,
            goals = excluded.goals,
            assists = excluded.assists,
            source_json = excluded.source_json,
            updated_at = excluded.updated_at`,
          [
            `team:${teamId}:league:${leagueId}:season:${season}:player:${player.id}`,
            teamId,
            leagueId,
            season,
            String(player.id),
            player.name,
            player.age ?? null,
            player.number ?? null,
            player.position ?? null,
            player.photo ?? null,
            player.appearances ?? null,
            player.lineups ?? null,
            player.minutes ?? null,
            player.goals ?? null,
            player.assists ?? null,
            JSON.stringify(player),
            now
          ]
        );
      });

      dossier.transfers.forEach((transfer, index) => {
        this.db.run(
          `INSERT OR REPLACE INTO team_transfers (
            id, team_id, season, player_name, transfer_date, transfer_type, in_team_name,
            out_team_name, direction, source_json, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `team:${teamId}:season:${season}:transfer:${transfer.date ?? "unknown"}:${index}`,
            teamId,
            season,
            transfer.player,
            transfer.date ?? null,
            transfer.type ?? null,
            transfer.in ?? null,
            transfer.out ?? null,
            transfer.direction,
            JSON.stringify(transfer),
            now
          ]
        );
      });

      dossier.recentLineups.forEach((lineup) => {
        this.db.run(
          `INSERT INTO fixture_lineups (id, fixture_id, team_id, formation, lineup_json, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(fixture_id, team_id) DO UPDATE SET
            formation = excluded.formation,
            lineup_json = excluded.lineup_json,
            updated_at = excluded.updated_at`,
          [
            `fixture:${lineup.fixtureId}:team:${teamId}:lineup`,
            String(lineup.fixtureId),
            teamId,
            lineup.formation ?? null,
            JSON.stringify(lineup),
            now
          ]
        );
      });
    });
  }

  private upsertRankings(
    leagueId: string,
    season: number,
    rankingType: "top_scorers" | "top_assists",
    players: LeagueHistoricalDossier["topScorers"],
    now: number
  ) {
    players.forEach((player, index) => {
      this.db.run(
        `INSERT INTO league_player_rankings (
          id, league_id, season, ranking_type, rank, player_id, player_name, player_photo_url,
          team_name, goals, assists, appearances, minutes, source_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(league_id, season, ranking_type, player_id) DO UPDATE SET
          rank = excluded.rank,
          player_name = excluded.player_name,
          player_photo_url = excluded.player_photo_url,
          team_name = excluded.team_name,
          goals = excluded.goals,
          assists = excluded.assists,
          appearances = excluded.appearances,
          minutes = excluded.minutes,
          source_json = excluded.source_json,
          updated_at = excluded.updated_at`,
        [
          `league:${leagueId}:season:${season}:ranking:${rankingType}:player:${player.playerId}`,
          leagueId,
          season,
          rankingType,
          index + 1,
          String(player.playerId),
          player.player,
          player.photo ?? null,
          player.team,
          player.goals ?? null,
          player.assists ?? null,
          player.appearances ?? null,
          player.minutes ?? null,
          JSON.stringify(player),
          now
        ]
      );
    });
  }

  private upsertStatus(
    entityType: "league" | "team",
    entityId: string,
    leagueId: string | null,
    season: number,
    status: LeagueHistoricalDossier["dataStatus"] | TeamDossier["dataStatus"],
    now: number
  ) {
    this.db.run(
      `INSERT INTO season_data_status (
        id, entity_type, entity_id, league_id, season, requested_season, resolved_season,
        fallback_season_used, source, completeness, missing_data_json, errors_json,
        archive_eligible, refreshed_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(entity_type, entity_id, league_id, season) DO UPDATE SET
        requested_season = excluded.requested_season,
        resolved_season = excluded.resolved_season,
        fallback_season_used = excluded.fallback_season_used,
        source = excluded.source,
        completeness = excluded.completeness,
        missing_data_json = excluded.missing_data_json,
        errors_json = excluded.errors_json,
        archive_eligible = excluded.archive_eligible,
        refreshed_at = excluded.refreshed_at,
        updated_at = excluded.updated_at`,
      [
        `${entityType}:${entityId}:league:${leagueId ?? "none"}:season:${season}:status`,
        entityType,
        entityId,
        leagueId,
        season,
        status.requestedSeason ?? status.season,
        status.resolvedSeason ?? status.season,
        status.fallbackSeasonUsed ? 1 : 0,
        status.source,
        status.completeness ?? "partial",
        JSON.stringify(status.missingData ?? []),
        JSON.stringify(status.errors),
        status.archiveEligible ? 1 : 0,
        status.refreshedAt,
        now
      ]
    );
  }
}
