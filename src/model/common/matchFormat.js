export const FORMAT_MODES = ['firstTo', 'bestOf'];
export const FORMAT_MODE_LABELS = { firstTo: 'First to', bestOf: 'Best of' };

export function winsNeeded({ mode, value }) {
  return mode === 'bestOf' ? (value + 1) / 2 : value;
}

export const FORMAT_MAX = 21;

// Stepper: best-of moves through odd values only. Returns the same object when
// the step would leave 1..max, so callers can tell the end was reached.
export function stepFormat(format, direction, max = FORMAT_MAX) {
  const value = format.value + direction * (format.mode === 'bestOf' ? 2 : 1);
  return value < 1 || value > max ? format : { ...format, value };
}

// Switching mode keeps the wins needed: first to 3 <-> best of 5.
export function switchFormatMode(format, mode) {
  if (mode === format.mode) return format;
  const wins = winsNeeded(format);
  return { mode, value: mode === 'bestOf' ? wins * 2 - 1 : wins };
}

// "First to 3 legs", "Best of 1 set"
export function describeFormat(format, unit) {
  return `${FORMAT_MODE_LABELS[format.mode]} ${format.value} ${unit}${format.value === 1 ? '' : 's'}`;
}

export function formatError(format) {
  if (!format || !FORMAT_MODES.includes(format.mode)) return 'Choose first to or best of';
  if (!Number.isInteger(format.value) || format.value < 1) return 'Must be at least 1';
  if (format.mode === 'bestOf' && format.value % 2 === 0) return 'Best of must be an odd number';
  return null;
}

// Without sets every leg is in "set 0", so legIndexInSet is the global leg index.
export function starterFor(config, setIndex, legIndexInSet) {
  return (config.startingPlayerIndex + setIndex + legIndexInSet) % config.playerIds.length;
}

// Folds the winners of completed legs (in order) into match progress.
export function matchProgress(config, legWinners) {
  const playerCount = config.playerIds.length;
  const zeros = () => Array(playerCount).fill(0);
  const setsOn = config.sets.enabled;
  const legsToWin = setsOn ? config.sets.legsToWinSet : winsNeeded(config.legs.format);
  const setsToWin = setsOn ? winsNeeded(config.sets.format) : null;

  const setsWon = zeros();
  const legsWonTotal = zeros();
  let legsWonInCurrentSet = zeros();
  let setIndex = 0;
  let legIndexInSet = 0;
  let winnerIndex = null;
  const legs = [];

  for (const legWinner of legWinners) {
    const leg = { setIndex, legIndexInSet, starterIndex: starterFor(config, setIndex, legIndexInSet), winnerIndex: legWinner, setWinnerIndex: null };
    legs.push(leg);
    legsWonTotal[legWinner] += 1;
    legsWonInCurrentSet[legWinner] += 1;
    legIndexInSet += 1;
    if (legsWonInCurrentSet[legWinner] < legsToWin) continue;

    if (!setsOn) {
      winnerIndex = legWinner;
      continue;
    }
    leg.setWinnerIndex = legWinner;
    setsWon[legWinner] += 1;
    if (setsWon[legWinner] === setsToWin) {
      winnerIndex = legWinner;
    } else {
      setIndex += 1;
      legIndexInSet = 0;
      legsWonInCurrentSet = zeros();
    }
  }

  const next = winnerIndex === null
    ? { setIndex, legIndexInSet, starterIndex: starterFor(config, setIndex, legIndexInSet) }
    : null;
  return { setsWon, legsWonInCurrentSet, legsWonTotal, winnerIndex, legs, next };
}

// Combines per-leg states from a game type's replay into the common GameState.
// Only the last leg may be unfinished.
export function composeGameState(config, legStates) {
  const current = legStates.at(-1);
  const progress = matchProgress(config, legStates.map((l) => l.winnerIndex).filter((w) => w !== null));
  const legDone = current.winnerIndex !== null;
  let phase = 'playing';
  if (legDone) phase = progress.winnerIndex === null ? 'legComplete' : 'gameComplete';
  const position = legDone ? progress.legs.at(-1) : progress.next;

  return {
    config,
    phase,
    playerCount: config.playerIds.length,
    legIndex: legStates.length - 1,
    setIndex: position.setIndex,
    legIndexInSet: position.legIndexInSet,
    currentPlayerIndex: legDone ? null : current.currentPlayerIndex,
    setsWon: progress.setsWon,
    legsWonInCurrentSet: progress.legsWonInCurrentSet,
    legsWonTotal: progress.legsWonTotal,
    winnerIndex: progress.winnerIndex,
    completedLegs: progress.legs,
    next: progress.next,
    leg: current,
    legs: legStates,
  };
}
