import type { Fixture } from "../types";
import { mockProvider } from "./mockProvider";
import type { SportsDataProvider } from "./sportsDataProvider";

export const backendProvider: SportsDataProvider = {
  async listFixtures() {
    try {
      const response = await fetch("/api/fixtures");
      if (!response.ok) throw new Error(`Fixture request failed: ${response.status}`);
      return (await response.json()) as Fixture[];
    } catch (error) {
      console.warn("Backend fixture request failed; using mock fixtures", error);
      return mockProvider.listFixtures();
    }
  },

  async getFixture(id: string) {
    try {
      const response = await fetch(`/api/fixtures/${encodeURIComponent(id)}`);
      if (!response.ok) throw new Error(`Fixture detail request failed: ${response.status}`);
      return (await response.json()) as Fixture;
    } catch (error) {
      console.warn("Backend fixture detail request failed; using mock fixture", error);
      return mockProvider.getFixture(id);
    }
  }
};
