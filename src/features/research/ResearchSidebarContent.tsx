import { BarChart3 } from "lucide-react";
import type { LeagueSummary, TeamSummary } from "../../app/types";

interface ResearchSidebarContentProps {
  leagueSummaries: LeagueSummary[];
  teamSummaries: TeamSummary[];
}

export function ResearchSidebarContent({ leagueSummaries, teamSummaries }: ResearchSidebarContentProps) {
  return (
    <>
      <div className="rail-section-title">
        <BarChart3 size={16} aria-hidden="true" />
        Research browser
      </div>
      <div className="stats-rail-card">
        <span>Leagues loaded</span>
        <strong>{leagueSummaries.length}</strong>
      </div>
      <div className="stats-rail-card">
        <span>Teams loaded</span>
        <strong>{teamSummaries.length}</strong>
      </div>
    </>
  );
}
