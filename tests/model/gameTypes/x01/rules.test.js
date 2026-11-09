import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateScore } from '../../../../src/model/gameTypes/x01/rules.js';

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const IMPOSSIBLE = [163, 166, 169, 172, 173, 175, 176, 178, 179];

const doubleOut = (remaining) => ({ remaining, isIn: true, inRule: 'straight', outRule: 'double' });
const straightOut = (remaining) => ({ remaining, isIn: true, inRule: 'straight', outRule: 'straight' });
const notInYet = (remaining, outRule = 'double') => ({ remaining, isIn: false, inRule: 'double', outRule });

test('0-180 boundaries and input parsing', () => {
  assert.deepEqual(evaluateScore('0', doubleOut(501)), { valid: true });
  assert.deepEqual(evaluateScore(180, doubleOut(501)), { valid: true });
  assert.deepEqual(evaluateScore('181', doubleOut(501)), { valid: false, error: 'Max score is 180' });
  assert.deepEqual(evaluateScore('999', doubleOut(501)), { valid: false, error: 'Max score is 180' });
  for (const raw of ['', '  ', 'abc', '1.5', '-3', undefined, -1, 2.5]) {
    assert.deepEqual(evaluateScore(raw, doubleOut(501)), { valid: false, error: 'Enter a score' }, `raw ${raw}`);
  }
  assert.deepEqual(evaluateScore(' 60 ', doubleOut(501)), { valid: true });
});

test('every score 0-180 is valid mid-leg except the nine impossible ones', () => {
  for (const score of range(0, 180)) {
    const result = evaluateScore(score, doubleOut(501));
    if (IMPOSSIBLE.includes(score)) {
      assert.deepEqual(result, { valid: false, error: `${score} can't be scored with 3 darts` });
    } else {
      assert.equal(result.valid, true, `score ${score}`);
    }
  }
});

test('more than the remaining is too high', () => {
  assert.deepEqual(evaluateScore(41, doubleOut(40)), { valid: false, error: 'Too high, only 40 left' });
  assert.deepEqual(evaluateScore(41, straightOut(40)), { valid: false, error: 'Too high, only 40 left' });
});

test('double out: leaving 1 is invalid, leaving 2 is fine', () => {
  assert.deepEqual(evaluateScore(39, doubleOut(40)), {
    valid: false, error: 'That leaves 1, impossible with double out',
  });
  assert.deepEqual(evaluateScore(38, doubleOut(40)), { valid: true });
});

test('straight out: leaving 1 is fine', () => {
  assert.deepEqual(evaluateScore(39, straightOut(40)), { valid: true });
});

test('double out: checkout only on finishable totals', () => {
  assert.deepEqual(evaluateScore(40, doubleOut(40)), { valid: true, checkout: { minDarts: 1 } });
  assert.deepEqual(evaluateScore(170, doubleOut(170)), { valid: true, checkout: { minDarts: 3 } });
  for (const score of [159, 162, 165, 168]) {
    assert.deepEqual(evaluateScore(score, doubleOut(score)), {
      valid: false, error: `Can't check out ${score} with double out`,
    });
  }
  // 169 is caught earlier as impossible with 3 darts.
  assert.equal(evaluateScore(169, doubleOut(169)).error, "169 can't be scored with 3 darts");
});

test('straight out: any reachable total finishes', () => {
  assert.deepEqual(evaluateScore(1, straightOut(1)), { valid: true, checkout: { minDarts: 1 } });
  assert.deepEqual(evaluateScore(61, straightOut(61)), { valid: true, checkout: { minDarts: 2 } });
  assert.deepEqual(evaluateScore(180, straightOut(180)), { valid: true, checkout: { minDarts: 3 } });
});

test('double in: the exact going-in table', () => {
  assert.deepEqual(evaluateScore(0, notInYet(501)), { valid: true });
  assert.deepEqual(evaluateScore(1, notInYet(501)), { valid: false, error: "1 can't be scored starting on a double" });
  assert.deepEqual(evaluateScore(168, notInYet(501)), { valid: false, error: "168 can't be scored starting on a double" });
  assert.deepEqual(evaluateScore(171, notInYet(501)), { valid: false, error: "171 can't be scored starting on a double" });
  for (const score of [172, 173, 175, 176, 178, 179]) {
    assert.equal(evaluateScore(score, notInYet(501)).valid, false);
  }
  for (const score of [174, 177, 180]) {
    assert.deepEqual(evaluateScore(score, notInYet(501)), {
      valid: false, error: `${score} can't be scored starting on a double`,
    });
  }
  for (const score of [2, 3, 40, 100, 167, 170]) {
    assert.deepEqual(evaluateScore(score, notInYet(501)), { valid: true }, `score ${score}`);
  }
});

test('double in: once in, any score is allowed', () => {
  assert.deepEqual(evaluateScore(1, { ...notInYet(501), isIn: true }), { valid: true });
  assert.deepEqual(evaluateScore(180, { ...notInYet(501), isIn: true }), { valid: true });
});

test('double in: checking out on the going-in turn needs a double first', () => {
  assert.deepEqual(evaluateScore(40, notInYet(40)), { valid: true, checkout: { minDarts: 1 } });
  assert.deepEqual(evaluateScore(101, notInYet(101, 'straight')), { valid: true, checkout: { minDarts: 2 } });
  assert.deepEqual(evaluateScore(60, notInYet(60, 'straight')), { valid: true, checkout: { minDarts: 2 } });
  // 3 straight out going in: D1 + S1, two darts.
  assert.deepEqual(evaluateScore(3, notInYet(3, 'straight')), { valid: true, checkout: { minDarts: 2 } });
});

test('double in + double out: a checkout blocked only by the in rule names the in rule', () => {
  // 161 = T20 T17 Bull ends on a double, and D25 T20 T17 starts on one, but no
  // 3-dart route does both (max D + T + D is 160).
  assert.deepEqual(evaluateScore(161, notInYet(161)), {
    valid: false, error: "Can't check out 161 with double in",
  });
  // 3 = D1 S1 starts on a double, S1 D1 ends on one, but not both.
  assert.deepEqual(evaluateScore(3, notInYet(3)), {
    valid: false, error: "Can't check out 3 with double in",
  });
});
