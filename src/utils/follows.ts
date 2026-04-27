import type { Fixture } from "../types";

export interface FollowState {
  teams: string[];
  leagues: string[];
}

export const EMPTY_FOLLOWS: FollowState = {
  teams: [],
  leagues: []
};

export function loadFollows(storageKey: string): FollowState {
  try {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) {
      return EMPTY_FOLLOWS;
    }

    const parsedValue = JSON.parse(rawValue) as Partial<FollowState>;
    return {
      teams: Array.isArray(parsedValue.teams) ? parsedValue.teams.filter(Boolean) : [],
      leagues: Array.isArray(parsedValue.leagues) ? parsedValue.leagues.filter(Boolean) : []
    };
  } catch {
    return EMPTY_FOLLOWS;
  }
}

export function toggleFollow(state: FollowState, key: keyof FollowState, id: string): FollowState {
  const currentValues = state[key];
  const nextValues = currentValues.includes(id)
    ? currentValues.filter((value) => value !== id)
    : [...currentValues, id];

  return {
    ...state,
    [key]: nextValues
  };
}

export function isFixtureFollowed(fixture: Fixture, followedTeams: Set<string>, followedLeagues: Set<string>) {
  return (
    followedLeagues.has(fixture.competition) ||
    followedTeams.has(fixture.home.id) ||
    followedTeams.has(fixture.away.id)
  );
}
