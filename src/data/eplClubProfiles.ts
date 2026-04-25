export interface ClubProfile {
  aliases: string[];
  apiFootballTeamId?: number;
  founded?: number;
  nickname?: string;
  colours?: string;
  stadium: {
    name: string;
    city: string;
    capacity?: number;
    opened?: number;
    surface?: string;
    roof?: string;
    notes?: string;
  };
  media?: {
    crestUrl?: string;
    stadiumImageUrl?: string;
  };
  sources: string[];
  lastVerified: string;
}

export const EPL_LEAGUE_PROFILE = {
  name: "Premier League",
  aliases: ["premierleague", "premier league", "epl", "english premier league"],
  apiFootballLeagueId: 39,
  logoUrl: "https://media.api-sports.io/football/leagues/39.png"
};

export const CURRENT_EPL_TEAM_NAMES = [
  "Arsenal",
  "Aston Villa",
  "Bournemouth",
  "Brentford",
  "Brighton",
  "Burnley",
  "Chelsea",
  "Crystal Palace",
  "Everton",
  "Fulham",
  "Leeds United",
  "Liverpool",
  "Manchester City",
  "Manchester United",
  "Newcastle United",
  "Nottingham Forest",
  "Sunderland",
  "Tottenham Hotspur",
  "West Ham United",
  "Wolverhampton Wanderers"
];

export const eplClubProfiles: ClubProfile[] = [
  {
    aliases: ["arsenal"],
    apiFootballTeamId: 42,
    founded: 1886,
    nickname: "The Gunners",
    colours: "Red and white",
    stadium: {
      name: "Emirates Stadium",
      city: "London",
      capacity: 60704,
      opened: 2006,
      surface: "Grass",
      roof: "Covered stands, open pitch"
    },
    sources: ["https://www.premierleague.com/en/news/4372526/whats-new-for-202526-premier-league-has-new-stadium"],
    lastVerified: "2026-04-25"
  },
  {
    aliases: ["astonvilla", "aston villa"],
    apiFootballTeamId: 66,
    founded: 1874,
    nickname: "The Villans",
    colours: "Claret and blue",
    stadium: {
      name: "Villa Park",
      city: "Birmingham",
      capacity: 42657,
      opened: 1897,
      surface: "Grass",
      roof: "Covered stands, open pitch"
    },
    sources: ["https://en.wikipedia.org/wiki/List_of_Premier_League_stadiums"],
    lastVerified: "2026-04-25"
  },
  {
    aliases: ["bournemouth", "afcbournemouth", "afc bournemouth"],
    apiFootballTeamId: 35,
    founded: 1899,
    nickname: "The Cherries",
    colours: "Red and black",
    stadium: {
      name: "Vitality Stadium",
      city: "Bournemouth",
      capacity: 11307,
      opened: 1910,
      surface: "Grass",
      roof: "Covered stands, open pitch"
    },
    sources: ["https://en.wikipedia.org/wiki/List_of_Premier_League_stadiums"],
    lastVerified: "2026-04-25"
  },
  {
    aliases: ["brentford"],
    apiFootballTeamId: 55,
    founded: 1889,
    nickname: "The Bees",
    colours: "Red and white",
    stadium: {
      name: "Gtech Community Stadium",
      city: "London",
      capacity: 17250,
      opened: 2020,
      surface: "Grass",
      roof: "Covered stands, open pitch"
    },
    sources: ["https://en.wikipedia.org/wiki/List_of_Premier_League_stadiums"],
    lastVerified: "2026-04-25"
  },
  {
    aliases: ["brighton", "brightonhovealbion", "brighton & hove albion"],
    apiFootballTeamId: 51,
    founded: 1901,
    nickname: "The Seagulls",
    colours: "Blue and white",
    stadium: {
      name: "American Express Stadium",
      city: "Falmer",
      capacity: 31876,
      opened: 2011,
      surface: "Grass",
      roof: "Covered stands, open pitch"
    },
    sources: ["https://en.wikipedia.org/wiki/List_of_Premier_League_stadiums"],
    lastVerified: "2026-04-25"
  },
  {
    aliases: ["burnley"],
    apiFootballTeamId: 44,
    founded: 1882,
    nickname: "The Clarets",
    colours: "Claret and blue",
    stadium: {
      name: "Turf Moor",
      city: "Burnley",
      capacity: 21994,
      opened: 1883,
      surface: "Grass",
      roof: "Covered stands, open pitch"
    },
    sources: ["https://sports.yahoo.com/article/premier-league-biggest-stadiums-full-134600332.html"],
    lastVerified: "2026-04-25"
  },
  {
    aliases: ["chelsea"],
    apiFootballTeamId: 49,
    founded: 1905,
    nickname: "The Blues",
    colours: "Blue",
    stadium: {
      name: "Stamford Bridge",
      city: "London",
      capacity: 40341,
      opened: 1877,
      surface: "Grass",
      roof: "Covered stands, open pitch"
    },
    sources: ["https://en.wikipedia.org/wiki/List_of_Premier_League_stadiums"],
    lastVerified: "2026-04-25"
  },
  {
    aliases: ["crystalpalace", "crystal palace"],
    apiFootballTeamId: 52,
    founded: 1905,
    nickname: "The Eagles",
    colours: "Red and blue",
    stadium: {
      name: "Selhurst Park",
      city: "London",
      capacity: 25486,
      opened: 1924,
      surface: "Grass",
      roof: "Covered stands, open pitch"
    },
    sources: ["https://en.wikipedia.org/wiki/List_of_Premier_League_stadiums"],
    lastVerified: "2026-04-25"
  },
  {
    aliases: ["everton"],
    apiFootballTeamId: 45,
    founded: 1878,
    nickname: "The Toffees",
    colours: "Royal blue",
    stadium: {
      name: "Hill Dickinson Stadium",
      city: "Liverpool",
      capacity: 52769,
      opened: 2025,
      surface: "Grass",
      roof: "Covered stands, open pitch",
      notes: "New Premier League venue for Everton in 2025/26."
    },
    sources: ["https://www.premierleague.com/en/news/4372526/whats-new-for-202526-premier-league-has-new-stadium"],
    lastVerified: "2026-04-25"
  },
  {
    aliases: ["fulham"],
    apiFootballTeamId: 36,
    founded: 1879,
    nickname: "The Cottagers",
    colours: "White and black",
    stadium: {
      name: "Craven Cottage",
      city: "London",
      capacity: 25700,
      opened: 1896,
      surface: "Grass",
      roof: "Covered stands, open pitch"
    },
    sources: ["https://en.wikipedia.org/wiki/List_of_Premier_League_stadiums"],
    lastVerified: "2026-04-25"
  },
  {
    aliases: ["leeds", "leedsunited", "leeds united"],
    apiFootballTeamId: 63,
    founded: 1919,
    nickname: "The Whites",
    colours: "White",
    stadium: {
      name: "Elland Road",
      city: "Leeds",
      capacity: 37890,
      opened: 1897,
      surface: "Grass",
      roof: "Covered stands, open pitch"
    },
    sources: ["https://sports.yahoo.com/article/premier-league-biggest-stadiums-full-134600332.html"],
    lastVerified: "2026-04-25"
  },
  {
    aliases: ["liverpool"],
    apiFootballTeamId: 40,
    founded: 1892,
    nickname: "The Reds",
    colours: "Red",
    stadium: {
      name: "Anfield",
      city: "Liverpool",
      capacity: 61276,
      opened: 1884,
      surface: "Grass",
      roof: "Covered stands, open pitch"
    },
    sources: ["https://www.premierleague.com/en/news/4372526/whats-new-for-202526-premier-league-has-new-stadium"],
    lastVerified: "2026-04-25"
  },
  {
    aliases: ["manchestercity", "man city", "manchester city"],
    apiFootballTeamId: 50,
    founded: 1880,
    nickname: "City",
    colours: "Sky blue",
    stadium: {
      name: "Etihad Stadium",
      city: "Manchester",
      capacity: 55097,
      opened: 2002,
      surface: "Grass",
      roof: "Covered stands, open pitch"
    },
    sources: ["https://www.premierleague.com/en/news/4372526/whats-new-for-202526-premier-league-has-new-stadium"],
    lastVerified: "2026-04-25"
  },
  {
    aliases: ["manchesterunited", "man united", "manchester united"],
    apiFootballTeamId: 33,
    founded: 1878,
    nickname: "The Red Devils",
    colours: "Red, white and black",
    stadium: {
      name: "Old Trafford",
      city: "Manchester",
      capacity: 75653,
      opened: 1910,
      surface: "Grass",
      roof: "Covered stands, open pitch"
    },
    sources: ["https://www.premierleague.com/en/news/4372526/whats-new-for-202526-premier-league-has-new-stadium"],
    lastVerified: "2026-04-25"
  },
  {
    aliases: ["newcastle", "newcastleunited", "newcastle united"],
    apiFootballTeamId: 34,
    founded: 1892,
    nickname: "The Magpies",
    colours: "Black and white",
    stadium: {
      name: "St James' Park",
      city: "Newcastle upon Tyne",
      capacity: 52305,
      opened: 1892,
      surface: "Grass",
      roof: "Covered stands, open pitch"
    },
    sources: ["https://en.wikipedia.org/wiki/List_of_Premier_League_stadiums"],
    lastVerified: "2026-04-25"
  },
  {
    aliases: ["nottinghamforest", "nottingham forest"],
    apiFootballTeamId: 65,
    founded: 1865,
    nickname: "Forest",
    colours: "Red",
    stadium: {
      name: "The City Ground",
      city: "Nottingham",
      capacity: 30445,
      opened: 1898,
      surface: "Grass",
      roof: "Covered stands, open pitch"
    },
    sources: ["https://en.wikipedia.org/wiki/List_of_Premier_League_stadiums"],
    lastVerified: "2026-04-25"
  },
  {
    aliases: ["sunderland"],
    apiFootballTeamId: 746,
    founded: 1879,
    nickname: "The Black Cats",
    colours: "Red and white",
    stadium: {
      name: "Stadium of Light",
      city: "Sunderland",
      capacity: 48707,
      opened: 1997,
      surface: "Grass",
      roof: "Covered stands, open pitch"
    },
    sources: ["https://sports.yahoo.com/article/premier-league-biggest-stadiums-full-134600332.html"],
    lastVerified: "2026-04-25"
  },
  {
    aliases: ["tottenham", "tottenhamhotspur", "tottenham hotspur", "spurs"],
    apiFootballTeamId: 47,
    founded: 1882,
    nickname: "Spurs",
    colours: "White and navy",
    stadium: {
      name: "Tottenham Hotspur Stadium",
      city: "London",
      capacity: 62062,
      opened: 2019,
      surface: "Grass",
      roof: "Covered stands, open pitch",
      notes: "Includes a retractable pitch system."
    },
    sources: ["https://www.premierleague.com/en/news/4372526/whats-new-for-202526-premier-league-has-new-stadium"],
    lastVerified: "2026-04-25"
  },
  {
    aliases: ["westham", "westhamunited", "west ham", "west ham united"],
    apiFootballTeamId: 48,
    founded: 1895,
    nickname: "The Hammers",
    colours: "Claret and blue",
    stadium: {
      name: "London Stadium",
      city: "London",
      capacity: 62500,
      opened: 2012,
      surface: "Grass",
      roof: "Partial roof, open pitch"
    },
    sources: ["https://www.premierleague.com/en/news/4372526/whats-new-for-202526-premier-league-has-new-stadium"],
    lastVerified: "2026-04-25"
  },
  {
    aliases: ["wolves", "wolverhamptonwanderers", "wolverhampton wanderers"],
    apiFootballTeamId: 39,
    founded: 1877,
    nickname: "Wolves",
    colours: "Old gold and black",
    stadium: {
      name: "Molineux Stadium",
      city: "Wolverhampton",
      capacity: 31750,
      opened: 1889,
      surface: "Grass",
      roof: "Covered stands, open pitch"
    },
    sources: ["https://en.wikipedia.org/wiki/List_of_Premier_League_stadiums"],
    lastVerified: "2026-04-25"
  }
];

export function findClubProfile(teamId: string, teamName: string) {
  const normalizedValues = [normalizeClubKey(teamId), normalizeClubKey(teamName)];
  return eplClubProfiles.find((profile) =>
    String(profile.apiFootballTeamId) === teamId ||
    profile.aliases.some((alias) => normalizedValues.includes(normalizeClubKey(alias)))
  );
}

export function getCurrentEplTeams() {
  return eplClubProfiles.map((profile, index) => ({
    id: String(profile.apiFootballTeamId ?? CURRENT_EPL_TEAM_NAMES[index]),
    name: CURRENT_EPL_TEAM_NAMES[index],
    logoUrl: getClubCrestUrl(profile)
  }));
}

export function getClubCrestUrl(profile: ClubProfile | undefined) {
  if (!profile) return undefined;
  return profile.media?.crestUrl ?? (profile.apiFootballTeamId ? `https://media.api-sports.io/football/teams/${profile.apiFootballTeamId}.png` : undefined);
}

export function getLeagueLogoUrl(leagueName: string) {
  const normalizedLeague = normalizeClubKey(leagueName);
  return EPL_LEAGUE_PROFILE.aliases.some((alias) => normalizeClubKey(alias) === normalizedLeague)
    ? EPL_LEAGUE_PROFILE.logoUrl
    : undefined;
}

function normalizeClubKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}
