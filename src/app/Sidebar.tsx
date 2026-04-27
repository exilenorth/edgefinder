import { BarChart3, CalendarDays, Trophy } from "lucide-react";
import type React from "react";
import type { AppView } from "./types";

interface SidebarProps {
  appView: AppView;
  setAppView: (view: AppView) => void;
  followedCount: number;
  followedFixtureCount: number;
  assistantContent: React.ReactNode;
  researchContent: React.ReactNode;
}

export function Sidebar({
  appView,
  setAppView,
  followedCount,
  followedFixtureCount,
  assistantContent,
  researchContent
}: SidebarProps) {
  return (
    <aside className="fixture-rail" aria-label="EdgeFinder navigation">
      <div className="brand">
        <Trophy aria-hidden="true" />
        <div>
          <strong>EdgeFinder</strong>
          <span>Football decision desk</span>
        </div>
      </div>

      <section className="watchlist-summary" aria-label="Watchlist">
        <div>
          <span>Following</span>
          <strong>{followedCount}</strong>
        </div>
        <div>
          <span>Tracked fixtures</span>
          <strong>{followedFixtureCount}</strong>
        </div>
      </section>

      <nav className="area-tabs" aria-label="App areas">
        <button className={appView === "assistant" ? "is-active" : ""} type="button" onClick={() => setAppView("assistant")}>
          <CalendarDays size={15} aria-hidden="true" />
          Assistant
        </button>
        <button className={appView === "research" ? "is-active" : ""} type="button" onClick={() => setAppView("research")}>
          <BarChart3 size={15} aria-hidden="true" />
          Research
        </button>
      </nav>

      {appView === "assistant" ? assistantContent : researchContent}
    </aside>
  );
}
