import type { Fixture } from "../types";

export interface SportsDataProvider {
  listFixtures(): Promise<Fixture[]>;
  getFixture(id: string): Promise<Fixture | undefined>;
}
