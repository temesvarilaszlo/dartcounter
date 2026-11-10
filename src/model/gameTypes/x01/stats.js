import { countBuckets, maxOrNull, minOrNull, pooledAverage, sum } from '../../common/statsMath.js';

export const SCORE_BUCKETS = [
  { key: '180', min: 180, max: 180 },
  { key: '160-179', min: 160, max: 179 },
  { key: '140-159', min: 140, max: 159 },
  { key: '120-139', min: 120, max: 139 },
  { key: '100-119', min: 100, max: 119 },
  { key: '80-99', min: 80, max: 99 },
  { key: '60-79', min: 60, max: 79 },
  { key: '40-59', min: 40, max: 59 },
  { key: '20-39', min: 20, max: 39 },
  { key: '0-19', min: 0, max: 19 },
];

const FIRST_NINE_TURNS = 3;

// Per player (array indexed by seat) raw totals for one leg.
export function legStats(config, leg) {
  const players = config.playerIds.map(() => ({ scores: [], darts: 0, first9Points: 0, first9Darts: 0 }));
  for (const turn of leg.turns) {
    const player = players[turn.playerIndex];
    if (player.scores.length < FIRST_NINE_TURNS) {
      player.first9Points += turn.score;
      player.first9Darts += turn.darts;
    }
    player.scores.push(turn.score);
    player.darts += turn.darts;
  }
  return players.map((p) => {
    const points = sum(p.scores);
    const won = points === config.typeConfig.startScore;
    return {
      ...p,
      points,
      won,
      checkout: won ? p.scores.at(-1) : null,
      average: pooledAverage(points, p.darts),
      first9Average: pooledAverage(p.first9Points, p.first9Darts),
    };
  });
}

// Pools any number of one player's leg stats (one game, or all time).
export function summarizeLegs(playerLegs) {
  const points = sum(playerLegs.map((l) => l.points));
  const darts = sum(playerLegs.map((l) => l.darts));
  const scores = playerLegs.flatMap((l) => l.scores);
  const wonLegs = playerLegs.filter((l) => l.won);
  const wonLegDarts = wonLegs.map((l) => l.darts);
  return {
    points,
    darts,
    average: pooledAverage(points, darts),
    first9Average: pooledAverage(sum(playerLegs.map((l) => l.first9Points)), sum(playerLegs.map((l) => l.first9Darts))),
    highestFinish: maxOrNull(wonLegs.map((l) => l.checkout)),
    highestScore: maxOrNull(scores),
    bestLeg: minOrNull(wonLegDarts),
    worstLeg: maxOrNull(wonLegDarts),
    legsWon: wonLegs.length,
    buckets: countBuckets(scores, SCORE_BUCKETS),
  };
}

export function gameStats(config, legs) {
  const perLeg = legs.map((leg) => legStats(config, leg));
  return config.playerIds.map((_, seat) => summarizeLegs(perLeg.map((players) => players[seat])));
}

// Rows of the game detail "Details" table; `format` tells the view how to print.
export const gameStatsRows = [
  { key: 'average', label: '3-dart avg', format: 'decimal' },
  { key: 'first9Average', label: 'First 9 avg', format: 'decimal' },
  { key: 'highestFinish', label: 'Highest finish', format: 'integer' },
  { key: 'highestScore', label: 'Highest score', format: 'integer' },
  { key: 'bestLeg', label: 'Best leg', format: 'darts' },
  { key: 'worstLeg', label: 'Worst leg', format: 'darts' },
];

// One player's legs across the given games (every game must include the player).
function playerLegs(games, playerId) {
  return games.map((game) => {
    const seat = game.config.playerIds.indexOf(playerId);
    return { game, legs: game.legs.map((leg) => legStats(game.config, leg)[seat]) };
  });
}

// Leg length depends on the start score, so best/worst leg is listed per start
// score the player has played.
function legsByStartScore(perGame) {
  const byStart = new Map();
  for (const { game, legs } of perGame) {
    const start = game.config.typeConfig.startScore;
    byStart.set(start, [...(byStart.get(start) ?? []), ...legs]);
  }
  return [...byStart]
    .sort(([a], [b]) => a - b)
    .map(([startScore, legs]) => {
      const { bestLeg, worstLeg } = summarizeLegs(legs);
      return { startScore, bestLeg, worstLeg };
    });
}

export function allTimeStats(games, playerId) {
  const perGame = playerLegs(games, playerId);
  const { bestLeg, worstLeg, ...summary } = summarizeLegs(perGame.flatMap((g) => g.legs));
  return { ...summary, count180: summary.buckets['180'], legsByStartScore: legsByStartScore(perGame) };
}

// Describes the all-time screen; gamesPlayed/gamesWon come from statsService.
export const allTime = {
  highlights: [
    { key: 'count180', label: '180s', format: 'integer' },
    { key: 'average', label: 'Average', format: 'decimal' },
    { key: 'darts', label: 'Darts thrown', format: 'integer' },
    { key: 'gamesPlayed', label: 'Games played', format: 'integer' },
  ],
  sections: [
    { key: 'buckets', label: 'Scores', kind: 'buckets', buckets: SCORE_BUCKETS.map(({ key }) => ({ key, label: key })) },
    {
      key: 'records',
      label: 'Records',
      kind: 'rows',
      rows: [
        { key: 'highestFinish', label: 'Highest finish', format: 'integer' },
        { key: 'highestScore', label: 'Highest score', format: 'integer' },
      ],
    },
    { key: 'legsByStartScore', label: 'Best and worst leg', kind: 'legsByStartScore' },
  ],
  compute: allTimeStats,
};

// Live per-seat numbers for the game screen (current leg).
export function scoreboard(state) {
  return state.leg.players.map((p) => ({
    remaining: p.remaining,
    isIn: p.isIn,
    darts: p.darts,
    average: pooledAverage(p.points, p.darts),
    lastScore: p.lastScore,
  }));
}
