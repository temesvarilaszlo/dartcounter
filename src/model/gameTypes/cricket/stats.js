import { pooledAverage, sum } from '../../common/statsMath.js';
import { replayLeg } from './replay.js';
import { MARKS_TO_CLOSE, NUMBERS } from './rules.js';

// MPR is pooled like the X01 average: counting marks / darts x 3.
const mpr = (marks, darts) => pooledAverage(marks, darts);

export function legStats(config, leg) {
  const { players, winnerIndex } = replayLeg(config, leg);
  return players.map((p, seat) => ({
    darts: p.darts,
    marks: p.countingMarks,
    points: p.points,
    won: seat === winnerIndex,
    mpr: mpr(p.countingMarks, p.darts),
  }));
}

export function summarizeLegs(playerLegs) {
  const darts = sum(playerLegs.map((l) => l.darts));
  const marks = sum(playerLegs.map((l) => l.marks));
  return {
    darts,
    marks,
    points: sum(playerLegs.map((l) => l.points)),
    mpr: mpr(marks, darts),
    legsWon: playerLegs.filter((l) => l.won).length,
  };
}

export function gameStats(config, legs) {
  const perLeg = legs.map((leg) => legStats(config, leg));
  return config.playerIds.map((_, seat) => summarizeLegs(perLeg.map((players) => players[seat])));
}

export const gameStatsRows = [
  { key: 'mpr', label: 'MPR', format: 'decimal' },
  { key: 'marks', label: 'Total marks', format: 'integer' },
  { key: 'points', label: 'Total points', format: 'integer' },
];

export function allTimeStats(games, playerId) {
  return summarizeLegs(games.flatMap((game) => {
    const seat = game.config.playerIds.indexOf(playerId);
    return game.legs.map((leg) => legStats(game.config, leg)[seat]);
  }));
}

export const allTime = {
  highlights: [
    { key: 'gamesPlayed', label: 'Games played', format: 'integer' },
    { key: 'gamesWon', label: 'Games won', format: 'integer' },
    { key: 'mpr', label: 'MPR', format: 'decimal' },
  ],
  sections: [
    {
      key: 'totals',
      label: 'Totals',
      kind: 'rows',
      rows: [
        { key: 'marks', label: 'Total marks', format: 'integer' },
        { key: 'points', label: 'Total points', format: 'integer' },
        { key: 'darts', label: 'Darts thrown', format: 'integer' },
      ],
    },
  ],
  compute: allTimeStats,
};

// Live per-seat numbers for the game screen (current leg, pending darts included).
export function scoreboard(state) {
  return state.leg.players.map((p) => ({
    marks: { ...p.marks },
    points: p.points,
    darts: p.darts,
    mpr: mpr(p.countingMarks, p.darts),
  }));
}

// Board-wide view: which numbers are dead (closed by everyone) and the darts
// of the turn in progress.
export function board(state) {
  const players = state.leg.players;
  return {
    numbers: NUMBERS.map((n) => ({ n, dead: players.every((p) => p.marks[n] >= MARKS_TO_CLOSE) })),
    pendingDarts: state.leg.pendingDarts,
  };
}
