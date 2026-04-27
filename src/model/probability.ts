import type { Fixture, MarketSelection, PlayerSnapshot, TeamSnapshot } from "../types";

interface Scoreline {
  home: number;
  away: number;
  probability: number;
}

export type ModelConfidence = "Low" | "Medium" | "High";

export function analyseFixture(fixture: Fixture) {
  const homeExpectedGoals = expectedGoals(fixture.home, fixture.away, true);
  const awayExpectedGoals = expectedGoals(fixture.away, fixture.home, false);
  const scorelines = scoreMatrix(homeExpectedGoals, awayExpectedGoals, 7);

  const homeWin = scorelines.filter((score) => score.home > score.away).reduce(sumProbability, 0);
  const draw = scorelines.filter((score) => score.home === score.away).reduce(sumProbability, 0);
  const awayWin = scorelines.filter((score) => score.home < score.away).reduce(sumProbability, 0);
  const over25Probability = scorelines.filter((score) => score.home + score.away > 2.5).reduce(sumProbability, 0);
  const bttsProbability = scorelines.filter((score) => score.home > 0 && score.away > 0).reduce(sumProbability, 0);

  const resultMarkets = [
    toMarket(`${fixture.home.name} win`, homeWin, fixture.marketOdds.home),
    toMarket("Draw", draw, fixture.marketOdds.draw),
    toMarket(`${fixture.away.name} win`, awayWin, fixture.marketOdds.away)
  ];

  const topScorelines = [...scorelines].sort((a, b) => b.probability - a.probability).slice(0, 6);
  const scorerMarkets = [
    ...scorerSelections(fixture.home, homeExpectedGoals),
    ...scorerSelections(fixture.away, awayExpectedGoals)
  ].sort((a, b) => b.edge - a.edge || b.probability - a.probability);

  const sideMarkets = [
    toMarket("Over 2.5 goals", over25Probability, fixture.marketOdds.over25),
    toMarket("Both teams to score", bttsProbability, fixture.marketOdds.btts)
  ];

  const bestMarket = [...resultMarkets, ...sideMarkets, ...scorerMarkets].sort((a, b) => b.edge - a.edge)[0];

  return {
    homeExpectedGoals,
    awayExpectedGoals,
    resultMarkets,
    topScorelines,
    scorerMarkets: scorerMarkets.slice(0, 10),
    over25Probability,
    bttsProbability,
    bestMarket: {
      ...bestMarket,
      note:
        bestMarket.edge > 0 && bestMarket.marketOdds
          ? `Model probability is ${formatPercent(bestMarket.edge)} above implied market probability.`
          : bestMarket.edge > 0
            ? "Model probability is above the internal sample baseline, but no live market price is attached."
            : "No positive edge in the sample market."
    },
    confidence: confidenceLabel(fixture)
  };
}

export type FixtureAnalysis = ReturnType<typeof analyseFixture>;

function expectedGoals(attack: TeamSnapshot, defence: TeamSnapshot, homeAdvantage: boolean) {
  const recentAttack = attack.form.xgFor / 5;
  const recentDefenceAllowed = defence.form.xgAgainst / 5;
  const blend = recentAttack * 0.45 + recentDefenceAllowed * 0.35 + attack.attackRating * 0.2;
  const venueBoost = homeAdvantage ? 1.08 : 0.94;
  const defensiveDrag = 2 - defence.defenceRating;
  return clamp(blend * venueBoost * defensiveDrag, 0.25, 3.6);
}

function scoreMatrix(homeExpectedGoals: number, awayExpectedGoals: number, maxGoals: number): Scoreline[] {
  const scores: Scoreline[] = [];
  for (let home = 0; home <= maxGoals; home += 1) {
    for (let away = 0; away <= maxGoals; away += 1) {
      scores.push({
        home,
        away,
        probability: poisson(home, homeExpectedGoals) * poisson(away, awayExpectedGoals)
      });
    }
  }
  const total = scores.reduce(sumProbability, 0);
  return scores.map((score) => ({ ...score, probability: score.probability / total }));
}

function scorerSelections(team: TeamSnapshot, teamExpectedGoals: number): MarketSelection[] {
  const likelyPlayers = team.players.filter((player) => player.startsLikely);
  const totalPlayerThreat = likelyPlayers.reduce((total, player) => total + playerThreat(player), 0);

  return likelyPlayers.map((player) => {
    const share = playerThreat(player) / totalPlayerThreat;
    const playerExpectedGoals = teamExpectedGoals * share;
    const probability = 1 - Math.exp(-playerExpectedGoals);
    return toMarket(player.name, probability, player.anytimeOdds, team.name);
  });
}

function playerThreat(player: PlayerSnapshot) {
  return player.seasonXgPer90 * 0.55 + player.recentXgPer90 * 0.45;
}

function toMarket(label: string, probability: number, marketOdds?: number, context?: string): MarketSelection {
  const fairOdds = probability > 0 ? 1 / probability : 999;
  const impliedMarketProbability = marketOdds ? 1 / marketOdds : probability;
  return {
    label,
    context,
    probability,
    fairOdds,
    marketOdds,
    edge: probability - impliedMarketProbability
  };
}

function poisson(k: number, lambda: number) {
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

function factorial(value: number): number {
  if (value <= 1) return 1;
  return value * factorial(value - 1);
}

function sumProbability(total: number, item: { probability: number }) {
  return total + item.probability;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function confidenceLabel(fixture: Fixture): ModelConfidence {
  const starters = [...fixture.home.players, ...fixture.away.players].filter((player) => player.startsLikely).length;
  if (fixture.headToHead.length >= 3 && starters >= 10) return "Medium";
  return "Low";
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}
