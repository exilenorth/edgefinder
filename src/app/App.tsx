import React from "react";
import { Sidebar } from "./Sidebar";
import type { AppView, DateFilter, FixtureFilter, FixtureGroup, LeagueSummary, ResearchEntity, TeamSummary } from "./types";
import { AssistantSidebarContent } from "../features/assistant/AssistantSidebarContent";
import { BettingAssistantWorkspace } from "../features/assistant/BettingAssistantWorkspace";
import { ResearchHubWorkspace } from "../features/research/ResearchHubWorkspace";
import { ResearchSidebarContent } from "../features/research/ResearchSidebarContent";
import { backendProvider } from "../providers/backendProvider";
import { createCachedSportsDataProvider, type CacheEvent } from "../providers/cachedProvider";
import { analyseFixture } from "../model/probability";
import type { Fixture, TeamSnapshot } from "../types";
import { groupFixturesByDate, matchesDateWindow } from "../utils/fixtureFilters";
import { type FollowState, isFixtureFollowed, loadFollows, toggleFollow } from "../utils/follows";
import { formatKickoffTime } from "../utils/formatting";
import { buildLeagueSummaries, buildTeamSummaries } from "../utils/researchSummaries";

const CACHE_TTL_MS = 15 * 60 * 1000;
const FOLLOW_STORAGE_KEY = "edgefinder:follows:v1";
const FIXTURE_CACHE_KEY_PREFIX = "edgefinder:v2:fixture:";

interface AppLocation {
  view: AppView;
  fixtureId: string;
  researchEntity?: ResearchEntity;
}

export function App() {
  const initialLocation = React.useMemo(() => parseLocationFromUrl(), []);
  const [fixtures, setFixtures] = React.useState<Fixture[]>([]);
  const [selectedFixture, setSelectedFixture] = React.useState<Fixture | undefined>();
  const [selectedId, setSelectedId] = React.useState<string>(initialLocation.fixtureId);
  const [cacheEvent, setCacheEvent] = React.useState<CacheEvent | undefined>();
  const [fixtureFilter, setFixtureFilter] = React.useState<FixtureFilter>("all");
  const [dateFilter, setDateFilter] = React.useState<DateFilter>("all");
  const [selectedLeague, setSelectedLeague] = React.useState<string>("all");
  const [expandedGroupKeys, setExpandedGroupKeys] = React.useState<Set<string>>(new Set());
  const [appView, setAppView] = React.useState<AppView>(initialLocation.view);
  const [selectedResearchEntity, setSelectedResearchEntity] = React.useState<ResearchEntity | undefined>(
    initialLocation.researchEntity
  );
  const [navigationHistory, setNavigationHistory] = React.useState<AppLocation[]>([]);
  const [follows, setFollows] = React.useState<FollowState>(() => loadFollows(FOLLOW_STORAGE_KEY));

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
  const currentLocation = React.useMemo<AppLocation>(
    () => ({
      view: appView,
      fixtureId: selectedId,
      researchEntity: selectedResearchEntity
    }),
    [appView, selectedId, selectedResearchEntity]
  );

  React.useEffect(() => {
    fixtureProvider.listFixtures().then((items) => {
      setFixtures(items);
      setSelectedId((current) => current || items[0]?.id || "");
    });
  }, [fixtureProvider]);

  React.useEffect(() => {
    if (!selectedId) return;
    writeLocationToUrl(currentLocation, "replace");
  }, [currentLocation, selectedId]);

  React.useEffect(() => {
    const handlePopState = () => {
      applyLocation(parseLocationFromUrl());
      setNavigationHistory((current) => current.slice(0, -1));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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
  const selectedFixtureCacheEvent = selected && cacheEvent?.key === getFixtureCacheKey(selected.id) ? cacheEvent : undefined;

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

  function pushCurrentLocation() {
    if (currentLocation.view === "assistant" && !currentLocation.fixtureId) return;

    setNavigationHistory((current) => {
      const previous = current[current.length - 1];
      if (previous && isSameLocation(previous, currentLocation)) return current;
      return [...current, currentLocation].slice(-12);
    });
  }

  function applyLocation(location: AppLocation) {
    setAppView(location.view);
    setSelectedId(location.fixtureId);
    setSelectedResearchEntity(location.researchEntity);
  }

  function navigateToLocation(location: AppLocation, mode: "push" | "replace" = "push") {
    applyLocation(location);
    writeLocationToUrl(location, mode);
  }

  function goBack() {
    const previousLocation = navigationHistory[navigationHistory.length - 1];
    if (!previousLocation) return;

    setNavigationHistory((current) => current.slice(0, -1));
    navigateToLocation(previousLocation);
  }

  function switchView(nextView: AppView) {
    if (nextView === appView) return;

    pushCurrentLocation();
    navigateToLocation({
      ...currentLocation,
      view: nextView
    });
  }

  function openResearch(entity: ResearchEntity) {
    pushCurrentLocation();
    navigateToLocation({
      view: "research",
      fixtureId: selectedId,
      researchEntity: entity
    });
  }

  function openAssistantFixture(fixtureId: string) {
    pushCurrentLocation();
    setFixtureFilter("all");
    setDateFilter("all");
    setSelectedLeague("all");
    navigateToLocation({
      view: "assistant",
      fixtureId,
      researchEntity: selectedResearchEntity
    });
  }

  function selectFixture(fixtureId: string) {
    setSelectedId(fixtureId);
    writeLocationToUrl(
      {
        ...currentLocation,
        fixtureId
      },
      "replace"
    );
  }

  return (
    <main className="app-shell">
      <Sidebar
        appView={appView}
        setAppView={switchView}
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
            setSelectedId={selectFixture}
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
          selectedResearchEntity={selectedResearchEntity}
          onOpenFixtureInAssistant={openAssistantFixture}
          canGoBack={navigationHistory.length > 0}
          onGoBack={goBack}
        />
      ) : selected && analysis ? (
        <BettingAssistantWorkspace
          selected={selected}
          fixtures={visibleFixtures}
          analysis={analysis}
          cacheEvent={selectedFixtureCacheEvent}
          selectedIsFollowed={selectedIsFollowed}
          followedLeagues={followedLeagues}
          followedTeamIds={followedTeamIds}
          onSelectFixture={selectFixture}
          onToggleLeague={toggleLeague}
          onToggleTeam={toggleTeam}
          onOpenResearchLeague={(league) => openResearch({ type: "league", name: league })}
          onOpenResearchTeam={(team) => openResearch({ type: "team", id: team.id, name: team.name })}
          canGoBack={navigationHistory.length > 0}
          onGoBack={goBack}
        />
      ) : (
        <section className="empty-state">Loading fixtures...</section>
      )}
    </main>
  );
}

function getFixtureCacheKey(fixtureId: string) {
  return `${FIXTURE_CACHE_KEY_PREFIX}${fixtureId}`;
}

function isSameLocation(first: AppLocation, second: AppLocation) {
  return (
    first.view === second.view &&
    first.fixtureId === second.fixtureId &&
    getResearchEntityKey(first.researchEntity) === getResearchEntityKey(second.researchEntity)
  );
}

function getResearchEntityKey(entity: ResearchEntity | undefined) {
  if (!entity) return "";
  return entity.type === "league" ? `${entity.type}:${entity.name}` : `${entity.type}:${entity.id}:${entity.name}`;
}

function parseLocationFromUrl(): AppLocation {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view") === "research" ? "research" : "assistant";
  const fixtureId = params.get("fixture") ?? "";
  const researchEntity = parseResearchEntity(params);

  return {
    view,
    fixtureId,
    researchEntity
  };
}

function parseResearchEntity(params: URLSearchParams): ResearchEntity | undefined {
  const type = params.get("entity");
  const id = params.get("entityId") ?? "";
  const name = params.get("entityName") ?? "";

  if (type === "league" && name) {
    return { type, name };
  }

  if ((type === "team" || type === "player" || type === "fixture") && id && name) {
    return { type, id, name };
  }

  return undefined;
}

function writeLocationToUrl(location: AppLocation, mode: "push" | "replace") {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("view", location.view);

  if (location.fixtureId) {
    url.searchParams.set("fixture", location.fixtureId);
  }

  if (location.researchEntity) {
    url.searchParams.set("entity", location.researchEntity.type);
    url.searchParams.set("entityName", location.researchEntity.name);

    if (location.researchEntity.type !== "league") {
      url.searchParams.set("entityId", location.researchEntity.id);
    }
  }

  const nextPath = `${url.pathname}${url.search}${url.hash}`;
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextPath === currentPath) return;

  if (mode === "push") {
    window.history.pushState(null, "", nextPath);
  } else {
    window.history.replaceState(null, "", nextPath);
  }
}


