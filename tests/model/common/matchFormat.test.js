import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatError, matchProgress, starterFor, winsNeeded } from '../../../src/model/common/matchFormat.js';
import { matchConfig } from '../../fixtures/x01.js';

test('wins needed: first-to is the value, best-of is (value + 1) / 2', () => {
  assert.equal(winsNeeded({ mode: 'firstTo', value: 3 }), 3);
  assert.equal(winsNeeded({ mode: 'bestOf', value: 1 }), 1);
  assert.equal(winsNeeded({ mode: 'bestOf', value: 5 }), 3);
});

test('format validation enforces mode, positive integers and odd best-of', () => {
  assert.equal(formatError({ mode: 'firstTo', value: 2 }), null);
  assert.equal(formatError({ mode: 'bestOf', value: 3 }), null);
  assert.equal(formatError({ mode: 'bestOf', value: 4 }), 'Best of must be an odd number');
  assert.equal(formatError({ mode: 'firstTo', value: 0 }), 'Must be at least 1');
  assert.equal(formatError({ mode: 'firstTo', value: 1.5 }), 'Must be at least 1');
  assert.equal(formatError({ mode: 'raceTo', value: 3 }), 'Choose first to or best of');
  assert.equal(formatError(undefined), 'Choose first to or best of');
});

const starters = (config, winners) => {
  const progress = matchProgress(config, winners);
  return [...progress.legs.map((l) => l.starterIndex), progress.next?.starterIndex];
};

test('without sets the starter rotates every leg', () => {
  const config = matchConfig({ legs: { mode: 'firstTo', value: 5 } });
  assert.deepEqual(starters(config, [0, 0, 1, 1]), [0, 1, 0, 1, 0]);
  assert.equal(starterFor(config, 0, 3), 1);
});

test('three players rotate through all seats', () => {
  const config = matchConfig({ players: 3, legs: { mode: 'firstTo', value: 5 } });
  assert.deepEqual(starters(config, [0, 1, 2, 0]), [0, 1, 2, 0, 1]);
});

test('with sets each set is opened by the next player, whoever started the last leg', () => {
  const config = matchConfig({ sets: { format: { mode: 'firstTo', value: 3 }, legsToWinSet: 2 } });
  // Set 1 ends after 2 legs (last leg started by B): set 2 opened by B.
  assert.deepEqual(starters(config, [0, 0]), [0, 1, 1]);
  // Set 1 ends after 3 legs (last leg started by A): set 2 still opened by B.
  assert.deepEqual(starters(config, [0, 1, 0]), [0, 1, 0, 1]);
  // Inside set 2 the starter rotates per leg; set 3 is opened by A again.
  assert.deepEqual(starters(config, [0, 1, 0, 1, 1]), [0, 1, 0, 1, 0, 0]);
});

test('with sets and three players the set opener rotates through all seats', () => {
  const config = matchConfig({ players: 3, sets: { format: { mode: 'firstTo', value: 3 }, legsToWinSet: 1 } });
  assert.deepEqual(starters(config, [0, 1]), [0, 1, 2]);
});

test('legs without sets: first to N legs wins and counters accumulate', () => {
  const config = matchConfig({ legs: { mode: 'bestOf', value: 3 } });
  const midway = matchProgress(config, [0, 1]);
  assert.deepEqual(midway.legsWonTotal, [1, 1]);
  assert.deepEqual(midway.legsWonInCurrentSet, [1, 1]);
  assert.deepEqual(midway.setsWon, [0, 0]);
  assert.equal(midway.winnerIndex, null);
  assert.deepEqual(midway.next, { setIndex: 0, legIndexInSet: 2, starterIndex: 0 });

  const done = matchProgress(config, [0, 1, 1]);
  assert.equal(done.winnerIndex, 1);
  assert.equal(done.next, null);
  assert.equal(done.legs.at(-1).setWinnerIndex, null);
});

test('sets: leg counters reset per set and the game ends at the sets target', () => {
  const config = matchConfig({ sets: { format: { mode: 'bestOf', value: 3 }, legsToWinSet: 2 } });
  const afterSet1 = matchProgress(config, [1, 0, 1]);
  assert.deepEqual(afterSet1.setsWon, [0, 1]);
  assert.deepEqual(afterSet1.legsWonInCurrentSet, [0, 0]);
  assert.deepEqual(afterSet1.legsWonTotal, [1, 2]);
  assert.equal(afterSet1.legs.at(-1).setWinnerIndex, 1);
  assert.deepEqual(afterSet1.next, { setIndex: 1, legIndexInSet: 0, starterIndex: 1 });

  const done = matchProgress(config, [1, 0, 1, 1, 1]);
  assert.equal(done.winnerIndex, 1);
  assert.deepEqual(done.setsWon, [0, 2]);
  // The final set's leg score stays visible.
  assert.deepEqual(done.legsWonInCurrentSet, [0, 2]);
  assert.equal(done.next, null);
});

test('no legs played yet', () => {
  const progress = matchProgress(matchConfig(), []);
  assert.deepEqual(progress.legs, []);
  assert.deepEqual(progress.next, { setIndex: 0, legIndexInSet: 0, starterIndex: 0 });
});

test('stepper: first-to moves by 1, best-of by 2 through odd values, within 1..max', async () => {
  const { stepFormat, FORMAT_MAX } = await import('../../../src/model/common/matchFormat.js');
  assert.deepEqual(stepFormat({ mode: 'firstTo', value: 3 }, 1), { mode: 'firstTo', value: 4 });
  assert.deepEqual(stepFormat({ mode: 'bestOf', value: 3 }, -1), { mode: 'bestOf', value: 1 });
  const one = { mode: 'bestOf', value: 1 };
  assert.equal(stepFormat(one, -1), one);
  const top = { mode: 'firstTo', value: FORMAT_MAX };
  assert.equal(stepFormat(top, 1), top);
  assert.deepEqual(stepFormat({ mode: 'firstTo', value: 2 }, 1, 2), { mode: 'firstTo', value: 2 });
});

test('switching mode keeps the wins needed', async () => {
  const { switchFormatMode } = await import('../../../src/model/common/matchFormat.js');
  assert.deepEqual(switchFormatMode({ mode: 'firstTo', value: 3 }, 'bestOf'), { mode: 'bestOf', value: 5 });
  assert.deepEqual(switchFormatMode({ mode: 'bestOf', value: 5 }, 'firstTo'), { mode: 'firstTo', value: 3 });
  const same = { mode: 'firstTo', value: 1 };
  assert.equal(switchFormatMode(same, 'firstTo'), same);
});

test('describeFormat pluralises the unit', async () => {
  const { describeFormat } = await import('../../../src/model/common/matchFormat.js');
  assert.equal(describeFormat({ mode: 'firstTo', value: 3 }, 'leg'), 'First to 3 legs');
  assert.equal(describeFormat({ mode: 'bestOf', value: 1 }, 'set'), 'Best of 1 set');
});
