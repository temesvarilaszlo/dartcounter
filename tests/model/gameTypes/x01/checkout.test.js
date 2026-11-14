import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DARTS, checkoutRoute, dartLabel, isDouble, minDarts } from '../../../../src/model/gameTypes/x01/checkout.js';

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

const ROUTE_DARTS = new Map(DARTS.map((d) => [dartLabel(d), d]));

test('dart labels: T/D prefixes, plain singles, 25 and Bull', () => {
  const labels = DARTS.map(dartLabel);
  for (const label of ['1', '20', '25', 'D1', 'D20', 'Bull', 'T1', 'T20']) assert.ok(labels.includes(label), label);
  assert.equal(ROUTE_DARTS.size, DARTS.length);
});

test('double-out routes follow the DartCounter table', () => {
  const cases = {
    170: 'T20 T20 Bull', 167: 'T20 T19 Bull', 160: 'T20 T20 D20', 141: 'T20 T19 D12', 125: 'T20 25 D20',
    120: 'T20 20 D20', 111: 'T20 19 D16', 101: 'T20 9 D16', 100: 'T20 D20', 80: 'T20 D10', 61: '25 D18',
    60: '20 D20', 50: '18 D16', 41: '9 D16', 40: 'D20', 3: '1 D1', 2: 'D1',
  };
  for (const [score, route] of Object.entries(cases)) {
    assert.deepEqual(checkoutRoute(Number(score), { last: isDouble }), route.split(' '), `route ${score}`);
  }
  for (const score of [1, 159, 169, 171, 501]) assert.equal(checkoutRoute(score, { last: isDouble }), null);
});

test('recommended straight-out routes', () => {
  const cases = { 180: 'T20 T20 T20', 61: 'T20 1', 60: 'T20', 25: '25', 1: '1' };
  for (const [score, route] of Object.entries(cases)) {
    assert.deepEqual(checkoutRoute(Number(score)), route.split(' '), `route ${score}`);
  }
  assert.equal(checkoutRoute(179), null);
});

test('double-in routes open on a double', () => {
  assert.deepEqual(checkoutRoute(101, { first: isDouble, last: isDouble }), ['Bull', '19', 'D16']);
  assert.deepEqual(checkoutRoute(60, { first: isDouble }), ['D20', '20']);
});

// The DartCounter table sometimes takes an extra dart (50: 18 D16, not Bull);
// the brute-force routes always use the fewest.
test('every route sums to the total, fits in 3 darts and respects the rules', () => {
  const rules = [{}, { last: isDouble }, { first: isDouble }, { first: isDouble, last: isDouble }];
  for (const rule of rules) {
    for (const total of range(1, 180)) {
      const route = checkoutRoute(total, rule);
      const darts = minDarts(total, rule);
      if (darts === null) {
        assert.equal(route, null);
        continue;
      }
      const parsed = route.map((label) => ROUTE_DARTS.get(label));
      const fromTable = !rule.first && rule.last;
      if (fromTable) assert.ok(parsed.length >= darts && parsed.length <= 3, `${total} dart count`);
      else assert.equal(parsed.length, darts, `${total} dart count`);
      assert.equal(parsed.reduce((s, d) => s + d.value, 0), total, `${total} sum`);
      if (rule.first) assert.ok(rule.first(parsed[0]), `${total} first dart`);
      if (rule.last) assert.ok(rule.last(parsed.at(-1)), `${total} last dart`);
    }
  }
});
