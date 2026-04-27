import { CalendarDays, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { LogoMark } from "../../components/LogoMark";
import { getTeamLogoUrl } from "../../utils/teamAssets";
import type { DateFilter, FixtureFilter, FixtureGroup } from "../../app/types";

interface AssistantSidebarContentProps {
  fixtureFilter: FixtureFilter;
  dateFilter: DateFilter;
  selectedLeague: string;
  leagueOptions: string[];
  visibleFixtureGroups: FixtureGroup[];
  expandedGroupKeys: Set<string>;
  selectedId: string;
  setFixtureFilter: (filter: FixtureFilter) => void;
  setDateFilter: (filter: DateFilter) => void;
  setSelectedLeague: (league: string) => void;
  setSelectedId: (fixtureId: string) => void;
  toggleFixtureGroup: (key: string) => void;
  formatKickoffTime: (value: string) => string;
}

export function AssistantSidebarContent({
  fixtureFilter,
  dateFilter,
  selectedLeague,
  leagueOptions,
  visibleFixtureGroups,
  expandedGroupKeys,
  selectedId,
  setFixtureFilter,
  setDateFilter,
  setSelectedLeague,
  setSelectedId,
  toggleFixtureGroup,
  formatKickoffTime
}: AssistantSidebarContentProps) {
  return (
    <>
      <div className="filter-tabs" aria-label="Fixture filter">
        <button className={fixtureFilter === "all" ? "is-active" : ""} type="button" onClick={() => setFixtureFilter("all")}>
          All
        </button>
        <button
          className={fixtureFilter === "following" ? "is-active" : ""}
          type="button"
          onClick={() => setFixtureFilter("following")}
        >
          Following
        </button>
      </div>

      <div className="quick-filters" aria-label="Date filter">
        <button className={dateFilter === "all" ? "is-active" : ""} type="button" onClick={() => setDateFilter("all")}>
          All dates
        </button>
        <button className={dateFilter === "today" ? "is-active" : ""} type="button" onClick={() => setDateFilter("today")}>
          Today
        </button>
        <button className={dateFilter === "next24" ? "is-active" : ""} type="button" onClick={() => setDateFilter("next24")}>
          <Clock size={14} aria-hidden="true" />
          24h
        </button>
        <button className={dateFilter === "weekend" ? "is-active" : ""} type="button" onClick={() => setDateFilter("weekend")}>
          Weekend
        </button>
      </div>

      <div className="league-filter" aria-label="League filter">
        <button className={selectedLeague === "all" ? "is-active" : ""} type="button" onClick={() => setSelectedLeague("all")}>
          All leagues
        </button>
        {leagueOptions.map((league) => (
          <button
            className={selectedLeague === league ? "is-active" : ""}
            type="button"
            onClick={() => setSelectedLeague(league)}
            key={league}
          >
            {league}
          </button>
        ))}
      </div>

      <div className="rail-section-title">
        <CalendarDays size={16} aria-hidden="true" />
        {fixtureFilter === "following" ? "Followed fixtures" : "Upcoming fixtures"}
      </div>

      <div className="fixture-groups">
        {visibleFixtureGroups.length > 0 ? (
          visibleFixtureGroups.map((group) => (
            <section className="fixture-day-group" key={group.key}>
              <button className="fixture-day-toggle" type="button" onClick={() => toggleFixtureGroup(group.key)}>
                {expandedGroupKeys.has(group.key) ? (
                  <ChevronDown size={15} aria-hidden="true" />
                ) : (
                  <ChevronRight size={15} aria-hidden="true" />
                )}
                <span>{group.label}</span>
                <small>{group.fixtures.length}</small>
              </button>
              {expandedGroupKeys.has(group.key) ? (
                <div className="fixture-list">
                  {group.fixtures.map((fixture) => (
                    <button
                      className={`fixture-card ${fixture.id === selectedId ? "is-selected" : ""}`}
                      key={fixture.id}
                      type="button"
                      onClick={() => setSelectedId(fixture.id)}
                    >
                      <span>{fixture.competition}</span>
                      <strong className="fixture-teams">
                        <LogoMark src={getTeamLogoUrl(fixture.home)} label={fixture.home.name} size="small" />
                        {fixture.home.name} v {fixture.away.name}
                        <LogoMark src={getTeamLogoUrl(fixture.away)} label={fixture.away.name} size="small" />
                      </strong>
                      <small>{formatKickoffTime(fixture.kickoff)}</small>
                    </button>
                  ))}
                </div>
              ) : null}
            </section>
          ))
        ) : (
          <div className="rail-empty">Follow a team or league from any fixture to build this view.</div>
        )}
      </div>
    </>
  );
}
