import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DARTS, isDouble, minDarts } from '../../../../src/model/gameTypes/x01/checkout.js';

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

test('the dart set has 62 distinct outcomes, bull only as single and double', () => {
  assert.equal(DARTS.length, 62);
  assert.ok(DARTS.some((d) => d.value === 50 && isDouble(d)));
  assert.ok(!DARTS.some((d) => d.value === 75));
});

test('scores impossible with 3 darts are exactly the nine known ones', () => {
  const impossible = range(1, 180).filter((s) => minDarts(s) === null);
  assert.deepEqual(impossible, [163, 166, 169, 172, 173, 175, 176, 178, 179]);
});

test('double-out finishes are 2-170 except 159, 162, 163, 165, 166, 168, 169', () => {
  const finishable = range(1, 200).filter((s) => minDarts(s, { last: isDouble }) !== null);
  const expected = range(2, 170).filter((s) => ![159, 162, 163, 165, 166, 168, 169].includes(s));
  assert.deepEqual(finishable, expected);
});

test('minimum checkout darts with double out', () => {
  const cases = { 2: 1, 40: 1, 50: 1, 3: 2, 41: 2, 100: 2, 110: 2, 99: 3, 170: 3, 159: null, 1: null };
  for (const [score, darts] of Object.entries(cases)) {
    assert.equal(minDarts(Number(score), { last: isDouble }), darts, `checkout ${score}`);
  }
});

test('minimum checkout darts with straight out', () => {
  const cases = { 60: 1, 61: 2, 180: 3, 21: 1, 1: 1, 179: null };
  for (const [score, darts] of Object.entries(cases)) {
    assert.equal(minDarts(Number(score)), darts, `checkout ${score}`);
  }
});

test('a first-dart constraint applies to single-dart sequences too', () => {
  assert.equal(minDarts(40, { first: isDouble, last: isDouble }), 1);
  assert.equal(minDarts(60, { first: isDouble }), 2);
  assert.equal(minDarts(170, { first: isDouble }), 3);
  assert.equal(minDarts(168, { first: isDouble }), null);
});
