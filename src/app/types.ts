import type { Fixture, TeamSnapshot } from "../types";

export type FixtureFilter = "all" | "following";
export type DateFilter = "all" | "today" | "next24" | "weekend";
export type AppView = "assistant" | "research";

export interface LeagueSummary {
  name: string;
  logoUrl?: string;
  fixtureCount: number;
  teamCount: number;
  nextKickoff?: string;
  fixtures: Fixture[];
}

export interface TeamSummary {
  team: TeamSnapshot;
  league: string;
  fixtureCount: number;
  nextFixture?: Fixture;
  fixtures: Fixture[];
}

export interface FixtureGroup {
  key: string;
  label: string;
  isPriority: boolean;
  fixtures: Fixture[];
}
