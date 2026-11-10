import { pooledAverage, sum } from '../../common/statsMath.js';
import { replayLeg } from './replay.js';

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
