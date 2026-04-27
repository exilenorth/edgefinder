import React from "react";
import { Sidebar } from "./Sidebar";
import type { AppView, DateFilter, FixtureFilter, FixtureGroup, LeagueSummary, TeamSummary } from "./types";
import { AssistantSidebarContent } from "../features/assistant/AssistantSidebarContent";
import { BettingAssistantWorkspace } from "../features/assistant/BettingAssistantWorkspace";
import { ResearchHubWorkspace } from "../features/research/ResearchHubWorkspace";
import { ResearchSidebarContent } from "../features/research/ResearchSidebarContent";
import { backendProvider } from "../providers/backendProvider";
import { createCachedSportsDataProvider, type CacheEvent } from "../providers/cachedProvider";
import { analyseFixture } from "../model/probability";
import type { Fixture, TeamSnapshot } from "../types";
import { getLeagueLogoUrl } from "../data/eplClubProfiles";

const CACHE_TTL_MS = 15 * 60 * 1000;
const FOLLOW_STORAGE_KEY = "edgefinder:follows:v1";

interface FollowState {
  teams: string[];
  leagues: string[];
}

const EMPTY_FOLLOWS: FollowState = {
  teams: [],
  leagues: []
};

export function App() {
  const [fixtures, setFixtures] = React.useState<Fixture[]>([]);
  const [selectedFixture, setSelectedFixture] = React.useState<Fixture | undefined>();
  const [selectedId, setSelectedId] = React.useState<string>("");
  const [cacheEvent, setCacheEvent] = React.useState<CacheEvent | undefined>();
  const [fixtureFilter, setFixtureFilter] = React.useState<FixtureFilter>("all");
  const [dateFilter, setDateFilter] = React.useState<DateFilter>("all");
  const [selectedLeague, setSelectedLeague] = React.useState<string>("all");
  const [expandedGroupKeys, setExpandedGroupKeys] = React.useState<Set<string>>(new Set());
  const [appView, setAppView] = React.useState<AppView>("assistant");
  const [follows, setFollows] = React.useState<FollowState>(() => loadFollows());

  const fixtureProvider = React.useMemo(
    () =>
      createCachedSportsDataProvider(backendProvider, {
        ttlMs: CACHE_TTL_MS,
        onCacheEvent: setCacheEvent
      }),
    []
  );

  const followedTeamIds = React.useMemo(() => new Set(follows.teams), [follows.teams]);
  const followedLeagues = React.useMemo(() => new Set(follows.leagues), [follows.leagues]);
  const followedCount = follows.teams.length + follows.leagues.length;
  const leagueOptions = React.useMemo(
    () => Array.from(new Set(fixtures.map((fixture) => fixture.competition))).sort((first, second) => first.localeCompare(second)),
    [fixtures]
  );

  const visibleFixtures = React.useMemo(() => {
    return fixtures.filter((fixture) => {
      const matchesFollowFilter =
        fixtureFilter === "all" || isFixtureFollowed(fixture, followedTeamIds, followedLeagues);
      const matchesDateFilter = matchesDateWindow(fixture, dateFilter);
      const matchesLeague = selectedLeague === "all" || fixture.competition === selectedLeague;

      return matchesFollowFilter && matchesDateFilter && matchesLeague;
    });
  }, [dateFilter, fixtureFilter, fixtures, followedLeagues, followedTeamIds, selectedLeague]);

  const followedFixtureCount = React.useMemo(
    () => fixtures.filter((fixture) => isFixtureFollowed(fixture, followedTeamIds, followedLeagues)).length,
    [fixtures, followedLeagues, followedTeamIds]
  );
  const visibleFixtureGroups = React.useMemo(() => groupFixturesByDate(visibleFixtures), [visibleFixtures]);
  const leagueSummaries = React.useMemo(() => buildLeagueSummaries(fixtures), [fixtures]);
  const teamSummaries = React.useMemo(() => buildTeamSummaries(fixtures), [fixtures]);

  React.useEffect(() => {
    fixtureProvider.listFixtures().then((items) => {
      setFixtures(items);
      setSelectedId(items[0]?.id ?? "");
    });
  }, [fixtureProvider]);

  React.useEffect(() => {
    if (!selectedId) {
      setSelectedFixture(undefined);
      return;
    }

    let cancelled = false;
    fixtureProvider.getFixture(selectedId).then((fixture) => {
      if (!cancelled) {
        setSelectedFixture(fixture);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fixtureProvider, selectedId]);

  React.useEffect(() => {
    window.localStorage.setItem(FOLLOW_STORAGE_KEY, JSON.stringify(follows));
  }, [follows]);

  React.useEffect(() => {
    if (fixtureFilter === "following" && visibleFixtures.length > 0 && !visibleFixtures.some((item) => item.id === selectedId)) {
      setSelectedId(visibleFixtures[0].id);
    }
  }, [fixtureFilter, selectedId, visibleFixtures]);

  React.useEffect(() => {
    setExpandedGroupKeys((current) => {
      const next = new Set(Array.from(current).filter((key) => visibleFixtureGroups.some((group) => group.key === key)));

      visibleFixtureGroups.forEach((group, index) => {
        if (group.isPriority || index === 0) {
          next.add(group.key);
        }
      });

      return next;
    });
  }, [visibleFixtureGroups]);

  const selected = selectedFixture ?? fixtures.find((fixture) => fixture.id === selectedId);
  const analysis = selected ? analyseFixture(selected) : undefined;
  const selectedIsFollowed = selected ? isFixtureFollowed(selected, followedTeamIds, followedLeagues) : false;

  function toggleTeam(team: TeamSnapshot) {
    setFollows((current) => toggleFollow(current, "teams", team.id));
  }

  function toggleLeague(league: string) {
    setFollows((current) => toggleFollow(current, "leagues", league));
  }

  function toggleFixtureGroup(key: string) {
    setExpandedGroupKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  return (
    <main className="app-shell">
      <Sidebar
        appView={appView}
        setAppView={setAppView}
        followedCount={followedCount}
        followedFixtureCount={followedFixtureCount}
        assistantContent={
          <AssistantSidebarContent
            fixtureFilter={fixtureFilter}
            dateFilter={dateFilter}
            selectedLeague={selectedLeague}
            leagueOptions={leagueOptions}
            visibleFixtureGroups={visibleFixtureGroups}
            expandedGroupKeys={expandedGroupKeys}
            selectedId={selectedId}
            setFixtureFilter={setFixtureFilter}
            setDateFilter={setDateFilter}
            setSelectedLeague={setSelectedLeague}
            setSelectedId={setSelectedId}
            toggleFixtureGroup={toggleFixtureGroup}
            formatKickoffTime={formatKickoffTime}
          />
        }
        researchContent={<ResearchSidebarContent leagueSummaries={leagueSummaries} teamSummaries={teamSummaries} />}
      />

      {appView === "research" ? (
        <ResearchHubWorkspace
          leagueSummaries={leagueSummaries}
          teamSummaries={teamSummaries}
          followedLeagues={followedLeagues}
          followedTeamIds={followedTeamIds}
          onToggleLeague={toggleLeague}
          onToggleTeam={toggleTeam}
        />
      ) : selected && analysis ? (
        <BettingAssistantWorkspace
          selected={selected}
          analysis={analysis}
          cacheEvent={cacheEvent}
          selectedIsFollowed={selectedIsFollowed}
          followedLeagues={followedLeagues}
          followedTeamIds={followedTeamIds}
          onToggleLeague={toggleLeague}
          onToggleTeam={toggleTeam}
        />
      ) : (
        <section className="empty-state">Loading fixtures...</section>
      )}
    </main>
  );
}


function buildLeagueSummaries(fixtures: Fixture[]): LeagueSummary[] {
  const leagues = new Map<string, { fixtures: Fixture[]; teams: Set<string>; logoUrl?: string }>();

  fixtures.forEach((fixture) => {
    const current = leagues.get(fixture.competition) ?? { fixtures: [], teams: new Set<string>(), logoUrl: undefined };
    current.fixtures.push(fixture);
    current.teams.add(fixture.home.id);
    current.teams.add(fixture.away.id);
    current.logoUrl = current.logoUrl ?? fixture.competitionLogoUrl ?? getLeagueLogoUrl(fixture.competition);
    leagues.set(fixture.competition, current);
  });

  return Array.from(leagues.entries())
    .map(([name, value]) => ({
      name,
      logoUrl: value.logoUrl,
      fixtureCount: value.fixtures.length,
      teamCount: value.teams.size,
      fixtures: value.fixtures
        .slice()
        .sort((first, second) => new Date(first.kickoff).getTime() - new Date(second.kickoff).getTime()),
      nextKickoff: value.fixtures
        .slice()
        .sort((first, second) => new Date(first.kickoff).getTime() - new Date(second.kickoff).getTime())[0]?.kickoff
    }))
    .sort((first, second) => first.name.localeCompare(second.name));
}

function buildTeamSummaries(fixtures: Fixture[]): TeamSummary[] {
  const teams = new Map<string, TeamSummary>();

  fixtures
    .slice()
    .sort((first, second) => new Date(first.kickoff).getTime() - new Date(second.kickoff).getTime())
    .forEach((fixture) => {
      [fixture.home, fixture.away].forEach((team) => {
        const key = `${fixture.competition}:${team.id}`;
        const current = teams.get(key);
        teams.set(key, {
          team,
          league: fixture.competition,
          fixtureCount: (current?.fixtureCount ?? 0) + 1,
          nextFixture: current?.nextFixture ?? fixture,
          fixtures: [...(current?.fixtures ?? []), fixture]
        });
      });
    });

  return Array.from(teams.values()).sort((first, second) => {
    const leagueSort = first.league.localeCompare(second.league);
    return leagueSort !== 0 ? leagueSort : first.team.name.localeCompare(second.team.name);
  });
}

function groupFixturesByDate(fixtures: Fixture[]): FixtureGroup[] {
  const groups = new Map<string, Fixture[]>();

  fixtures
    .slice()
    .sort((first, second) => new Date(first.kickoff).getTime() - new Date(second.kickoff).getTime())
    .forEach((fixture) => {
      const date = new Date(fixture.kickoff);
      const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
      ].join("-");
      groups.set(key, [...(groups.get(key) ?? []), fixture]);
    });

  return Array.from(groups.entries()).map(([key, groupedFixtures]) => ({
    key,
    label: formatFixtureGroupLabel(groupedFixtures[0].kickoff),
    isPriority: isPriorityFixtureGroup(groupedFixtures[0].kickoff),
    fixtures: groupedFixtures
  }));
}

function formatFixtureGroupLabel(value: string) {
  const fixtureDate = new Date(value);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (isSameCalendarDay(fixtureDate, today)) {
    return "Today";
  }

  if (isSameCalendarDay(fixtureDate, tomorrow)) {
    return "Tomorrow";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short"
  }).format(fixtureDate);
}

function formatKickoffTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function isPriorityFixtureGroup(value: string) {
  const fixtureDate = new Date(value);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  return isSameCalendarDay(fixtureDate, today) || isSameCalendarDay(fixtureDate, tomorrow);
}

function matchesDateWindow(fixture: Fixture, filter: DateFilter) {
  const kickoff = new Date(fixture.kickoff);
  const now = new Date();

  if (filter === "all") {
    return true;
  }

  if (filter === "today") {
    return isSameCalendarDay(kickoff, now);
  }

  if (filter === "next24") {
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return kickoff >= now && kickoff <= next24Hours;
  }

  const day = kickoff.getDay();
  return day === 0 || day === 6;
}

function isSameCalendarDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function loadFollows(): FollowState {
  try {
    const rawValue = window.localStorage.getItem(FOLLOW_STORAGE_KEY);
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

function toggleFollow(state: FollowState, key: keyof FollowState, id: string): FollowState {
  const currentValues = state[key];
  const nextValues = currentValues.includes(id)
    ? currentValues.filter((value) => value !== id)
    : [...currentValues, id];

  return {
    ...state,
    [key]: nextValues
  };
}

function isFixtureFollowed(fixture: Fixture, followedTeams: Set<string>, followedLeagues: Set<string>) {
  return (
    followedLeagues.has(fixture.competition) ||
    followedTeams.has(fixture.home.id) ||
    followedTeams.has(fixture.away.id)
  );
}
