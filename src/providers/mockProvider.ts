import type { Fixture } from "../types";
import type { SportsDataProvider } from "./sportsDataProvider";

const fixtures: Fixture[] = [
  {
    id: "ars-che-2026-04-26",
    competition: "Premier League",
    kickoff: "2026-04-26T16:30:00+01:00",
    venue: "Emirates Stadium",
    home: {
      id: "ars",
      name: "Arsenal",
      attackRating: 1.72,
      defenceRating: 1.31,
      form: { results: ["W", "W", "D", "W", "L"], goalsFor: 10, goalsAgainst: 4, xgFor: 10.8, xgAgainst: 4.7 },
      players: [
        { id: "saka", name: "Bukayo Saka", position: "RW", startsLikely: true, seasonXgPer90: 0.34, recentXgPer90: 0.41, anytimeOdds: 3.1 },
        { id: "havertz", name: "Kai Havertz", position: "CF", startsLikely: true, seasonXgPer90: 0.48, recentXgPer90: 0.52, anytimeOdds: 2.65 },
        { id: "odegaard", name: "Martin Odegaard", position: "AM", startsLikely: true, seasonXgPer90: 0.22, recentXgPer90: 0.24, anytimeOdds: 5.4 },
        { id: "martinelli", name: "Gabriel Martinelli", position: "LW", startsLikely: true, seasonXgPer90: 0.31, recentXgPer90: 0.29, anytimeOdds: 3.8 },
        { id: "rice", name: "Declan Rice", position: "CM", startsLikely: true, seasonXgPer90: 0.11, recentXgPer90: 0.16, anytimeOdds: 8.0 }
      ]
    },
    away: {
      id: "che",
      name: "Chelsea",
      attackRating: 1.49,
      defenceRating: 0.94,
      form: { results: ["D", "W", "L", "W", "D"], goalsFor: 9, goalsAgainst: 8, xgFor: 8.6, xgAgainst: 7.9 },
      players: [
        { id: "palmer", name: "Cole Palmer", position: "AM", startsLikely: true, seasonXgPer90: 0.42, recentXgPer90: 0.46, anytimeOdds: 3.4 },
        { id: "jackson", name: "Nicolas Jackson", position: "CF", startsLikely: true, seasonXgPer90: 0.51, recentXgPer90: 0.44, anytimeOdds: 3.15 },
        { id: "nkunku", name: "Christopher Nkunku", position: "FW", startsLikely: false, seasonXgPer90: 0.49, recentXgPer90: 0.38, anytimeOdds: 3.7 },
        { id: "madueke", name: "Noni Madueke", position: "RW", startsLikely: true, seasonXgPer90: 0.28, recentXgPer90: 0.31, anytimeOdds: 4.6 },
        { id: "caicedo", name: "Moises Caicedo", position: "CM", startsLikely: true, seasonXgPer90: 0.06, recentXgPer90: 0.08, anytimeOdds: 15.0 }
      ]
    },
    marketOdds: { home: 1.78, draw: 4.05, away: 4.45, over25: 1.7, btts: 1.74 },
    headToHead: [
      { date: "2025-11-30", home: "Chelsea", away: "Arsenal", homeGoals: 1, awayGoals: 1, homeXg: 1.2, awayXg: 1.5 },
      { date: "2025-03-16", home: "Arsenal", away: "Chelsea", homeGoals: 2, awayGoals: 1, homeXg: 2.0, awayXg: 0.8 },
      { date: "2024-10-20", home: "Chelsea", away: "Arsenal", homeGoals: 2, awayGoals: 2, homeXg: 1.4, awayXg: 1.8 }
    ]
  },
  {
    id: "liv-mci-2026-04-27",
    competition: "Premier League",
    kickoff: "2026-04-27T20:00:00+01:00",
    venue: "Anfield",
    home: {
      id: "liv",
      name: "Liverpool",
      attackRating: 1.84,
      defenceRating: 1.18,
      form: { results: ["W", "D", "W", "W", "W"], goalsFor: 13, goalsAgainst: 5, xgFor: 11.9, xgAgainst: 5.8 },
      players: [
        { id: "salah", name: "Mohamed Salah", position: "RW", startsLikely: true, seasonXgPer90: 0.55, recentXgPer90: 0.61, anytimeOdds: 2.35 },
        { id: "nunez", name: "Darwin Nunez", position: "CF", startsLikely: true, seasonXgPer90: 0.65, recentXgPer90: 0.58, anytimeOdds: 2.55 },
        { id: "jota", name: "Diogo Jota", position: "FW", startsLikely: false, seasonXgPer90: 0.6, recentXgPer90: 0.39, anytimeOdds: 2.9 },
        { id: "diaz", name: "Luis Diaz", position: "LW", startsLikely: true, seasonXgPer90: 0.33, recentXgPer90: 0.35, anytimeOdds: 3.6 },
        { id: "szobo", name: "Dominik Szoboszlai", position: "CM", startsLikely: true, seasonXgPer90: 0.17, recentXgPer90: 0.2, anytimeOdds: 6.8 }
      ]
    },
    away: {
      id: "mci",
      name: "Manchester City",
      attackRating: 1.9,
      defenceRating: 1.27,
      form: { results: ["W", "W", "D", "W", "L"], goalsFor: 12, goalsAgainst: 5, xgFor: 12.4, xgAgainst: 5.4 },
      players: [
        { id: "haaland", name: "Erling Haaland", position: "CF", startsLikely: true, seasonXgPer90: 0.78, recentXgPer90: 0.72, anytimeOdds: 2.05 },
        { id: "foden", name: "Phil Foden", position: "AM", startsLikely: true, seasonXgPer90: 0.33, recentXgPer90: 0.37, anytimeOdds: 4.0 },
        { id: "alvarez", name: "Julian Alvarez", position: "FW", startsLikely: true, seasonXgPer90: 0.36, recentXgPer90: 0.32, anytimeOdds: 3.9 },
        { id: "bernardo", name: "Bernardo Silva", position: "CM", startsLikely: true, seasonXgPer90: 0.15, recentXgPer90: 0.14, anytimeOdds: 8.5 },
        { id: "rodri", name: "Rodri", position: "DM", startsLikely: true, seasonXgPer90: 0.13, recentXgPer90: 0.18, anytimeOdds: 9.5 }
      ]
    },
    marketOdds: { home: 2.6, draw: 3.7, away: 2.55, over25: 1.58, btts: 1.55 },
    headToHead: [
      { date: "2025-12-01", home: "Manchester City", away: "Liverpool", homeGoals: 1, awayGoals: 2, homeXg: 1.6, awayXg: 1.7 },
      { date: "2025-02-23", home: "Manchester City", away: "Liverpool", homeGoals: 0, awayGoals: 2, homeXg: 0.9, awayXg: 1.5 },
      { date: "2024-12-01", home: "Liverpool", away: "Manchester City", homeGoals: 2, awayGoals: 0, homeXg: 2.4, awayXg: 0.8 }
    ]
  },
  {
    id: "bar-atm-2026-04-28",
    competition: "La Liga",
    kickoff: "2026-04-28T20:00:00+02:00",
    venue: "Estadi Olimpic Lluis Companys",
    home: {
      id: "bar",
      name: "Barcelona",
      attackRating: 1.81,
      defenceRating: 1.08,
      form: { results: ["W", "W", "W", "D", "L"], goalsFor: 11, goalsAgainst: 6, xgFor: 10.9, xgAgainst: 6.2 },
      players: [
        { id: "lewa", name: "Robert Lewandowski", position: "CF", startsLikely: true, seasonXgPer90: 0.66, recentXgPer90: 0.6, anytimeOdds: 2.25 },
        { id: "yamal", name: "Lamine Yamal", position: "RW", startsLikely: true, seasonXgPer90: 0.28, recentXgPer90: 0.34, anytimeOdds: 4.4 },
        { id: "raph", name: "Raphinha", position: "LW", startsLikely: true, seasonXgPer90: 0.34, recentXgPer90: 0.41, anytimeOdds: 3.8 },
        { id: "pedri", name: "Pedri", position: "CM", startsLikely: true, seasonXgPer90: 0.15, recentXgPer90: 0.16, anytimeOdds: 7.5 }
      ]
    },
    away: {
      id: "atm",
      name: "Atletico Madrid",
      attackRating: 1.54,
      defenceRating: 1.22,
      form: { results: ["D", "W", "W", "L", "W"], goalsFor: 8, goalsAgainst: 5, xgFor: 8.2, xgAgainst: 5.1 },
      players: [
        { id: "griez", name: "Antoine Griezmann", position: "FW", startsLikely: true, seasonXgPer90: 0.39, recentXgPer90: 0.36, anytimeOdds: 3.75 },
        { id: "morata", name: "Alvaro Morata", position: "CF", startsLikely: true, seasonXgPer90: 0.53, recentXgPer90: 0.49, anytimeOdds: 3.2 },
        { id: "correa", name: "Angel Correa", position: "FW", startsLikely: false, seasonXgPer90: 0.37, recentXgPer90: 0.3, anytimeOdds: 4.6 },
        { id: "llorente", name: "Marcos Llorente", position: "RM", startsLikely: true, seasonXgPer90: 0.18, recentXgPer90: 0.22, anytimeOdds: 7.0 }
      ]
    },
    marketOdds: { home: 1.95, draw: 3.65, away: 3.95, over25: 1.82, btts: 1.78 },
    headToHead: [
      { date: "2025-12-17", home: "Barcelona", away: "Atletico Madrid", homeGoals: 3, awayGoals: 1, homeXg: 2.1, awayXg: 0.9 },
      { date: "2025-03-16", home: "Atletico Madrid", away: "Barcelona", homeGoals: 2, awayGoals: 4, homeXg: 1.6, awayXg: 2.2 },
      { date: "2024-12-21", home: "Barcelona", away: "Atletico Madrid", homeGoals: 1, awayGoals: 2, homeXg: 1.5, awayXg: 1.2 }
    ]
  }
];

export const mockProvider: SportsDataProvider = {
  async listFixtures() {
    return fixtures;
  },
  async getFixture(id: string) {
    return fixtures.find((fixture) => fixture.id === id);
  }
};
