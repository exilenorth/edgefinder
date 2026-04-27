import { findClubProfile, getClubCrestUrl } from "../data/eplClubProfiles";
import type { TeamSnapshot } from "../types";

export function getTeamLogoUrl(team: TeamSnapshot) {
  return team.logoUrl ?? getClubCrestUrl(findClubProfile(team.id, team.name));
}
