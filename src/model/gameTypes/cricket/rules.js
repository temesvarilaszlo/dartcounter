export const NUMBERS = [20, 19, 18, 17, 16, 15, 25];
export const BULL = 25;
export const MARKS_TO_CLOSE = 3;

export const VARIANTS = {
  regular: { label: 'Regular', pointsTo: 'thrower', wins: (mine, theirs) => mine >= theirs },
  cutThroat: { label: 'Cut-throat', pointsTo: 'openOpponents', wins: (mine, theirs) => mine <= theirs },
};

export function dartError(dart) {
  if (dart?.miss === true) return null;
  if (!NUMBERS.includes(dart?.n)) return 'Only 15-20 and Bull count; record anything else as a miss';
  if (![1, 2, 3].includes(dart.m)) return 'A dart is a single, double or triple';
  if (dart.n === BULL && dart.m === 3) return 'There is no triple bull';
  return null;
}

export function createPlayers(playerCount) {
  return Array.from({ length: playerCount }, () => ({
    marks: Object.fromEntries(NUMBERS.map((n) => [n, 0])),
    points: 0,
    darts: 0,
    countingMarks: 0,
  }));
}

export const hasClosedAll = (player) => NUMBERS.every((n) => player.marks[n] >= MARKS_TO_CLOSE);

// Applies one dart in place. Marks beyond the third score only while at least
// one opponent still has the number open. "Counting" marks (for MPR) are the
// ones that close or score; marks on a dead number do not count.
export function throwDart(players, throwerIndex, dart, variant) {
  const thrower = players[throwerIndex];
  thrower.darts += 1;
  if (dart.miss) return;

  const before = thrower.marks[dart.n];
  const closing = Math.min(dart.m, Math.max(0, MARKS_TO_CLOSE - before));
  const extra = dart.m - closing;
  thrower.marks[dart.n] = Math.min(MARKS_TO_CLOSE, before + dart.m);
  thrower.countingMarks += closing;
  if (extra === 0) return;

  const openOpponents = players.filter((p, i) => i !== throwerIndex && p.marks[dart.n] < MARKS_TO_CLOSE);
  if (!openOpponents.length) return;
  const points = extra * dart.n;
  thrower.countingMarks += extra;
  if (VARIANTS[variant].pointsTo === 'thrower') thrower.points += points;
  else openOpponents.forEach((p) => { p.points += points; });
}

// The thrower is checked first, then the others in seat order: in cut-throat
// another player's points can rise on someone else's dart.
export function findWinner(players, throwerIndex, variant) {
  const { wins } = VARIANTS[variant];
  const order = [throwerIndex, ...[...players.keys()].filter((i) => i !== throwerIndex)];
  const winner = order.find((i) => hasClosedAll(players[i])
    && players.every((other, j) => j === i || wins(players[i].points, other.points)));
  return winner ?? null;
}
