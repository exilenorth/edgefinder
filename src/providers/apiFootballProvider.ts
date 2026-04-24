import type { Fixture } from "../types";
import type { SportsDataProvider } from "./sportsDataProvider";

const API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";

export class ApiFootballProvider implements SportsDataProvider {
  constructor(private readonly apiKey: string) {}

  async listFixtures(): Promise<Fixture[]> {
    const response = await fetch(`${API_FOOTBALL_BASE_URL}/fixtures?next=20`, {
      headers: { "x-apisports-key": this.apiKey }
    });

    if (!response.ok) {
      throw new Error(`API-Football fixtures request failed: ${response.status}`);
    }

    throw new Error(
      "API-Football mapping is intentionally not enabled yet. Map provider responses into Fixture once you choose the data plan for xG, odds, and player markets."
    );
  }

  async getFixture(id: string): Promise<Fixture | undefined> {
    const fixtures = await this.listFixtures();
    return fixtures.find((fixture) => fixture.id === id);
  }
}
