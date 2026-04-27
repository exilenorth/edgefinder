import type { DateFilter, FixtureGroup } from "../app/types";
import type { Fixture } from "../types";

export function groupFixturesByDate(fixtures: Fixture[]): FixtureGroup[] {
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

export function matchesDateWindow(fixture: Fixture, filter: DateFilter) {
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

function isPriorityFixtureGroup(value: string) {
  const fixtureDate = new Date(value);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  return isSameCalendarDay(fixtureDate, today) || isSameCalendarDay(fixtureDate, tomorrow);
}

function isSameCalendarDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}
