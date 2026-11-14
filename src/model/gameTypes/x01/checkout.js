import { DOUBLE_OUT_ROUTES } from './checkoutTable.js';

// Brute-force engine over every possible dart, so no checkout or
// impossible-score table is ever hand-maintained.
const SEGMENTS = Array.from({ length: 20 }, (_, i) => i + 1);

export const DARTS = [
  ...SEGMENTS.map((n) => ({ value: n, multiplier: 1 })),
  { value: 25, multiplier: 1 },
  ...SEGMENTS.map((n) => ({ value: n * 2, multiplier: 2 })),
  { value: 50, multiplier: 2 },
  ...SEGMENTS.map((n) => ({ value: n * 3, multiplier: 3 })),
];

export const anyDart = () => true;
export const isDouble = (dart) => dart.multiplier === 2;

const values = (darts) => new Set(darts.map((d) => d.value));

function sums(a, b) {
  const out = new Set();
  for (const x of a) for (const y of b) out.add(x + y);
  return out;
}

// cache: first predicate -> last predicate -> [totals with 1, 2, 3 darts]
const cache = new Map();

function totalsByDartCount(first, last) {
  if (!cache.has(first)) cache.set(first, new Map());
  const byLast = cache.get(first);
  if (!byLast.has(last)) {
    const all = values(DARTS);
    const firsts = values(DARTS.filter(first));
    const lasts = values(DARTS.filter(last));
    byLast.set(last, [
      values(DARTS.filter((d) => first(d) && last(d))),
      sums(firsts, lasts),
      sums(sums(firsts, all), lasts),
    ]);
  }
  return byLast.get(last);
}

// Smallest k in 1..3 such that some k-dart sequence sums to `total` with the
// first dart satisfying `first` and the last satisfying `last`; null if none.
export function minDarts(total, { first = anyDart, last = anyDart } = {}) {
  const index = totalsByDartCount(first, last).findIndex((totals) => totals.has(total));
  return index === -1 ? null : index + 1;
}

// Routes are ranked by how hard their darts are to hit: singles are easiest,
// then trebles, doubles and the bull; finishing on a double players practise
// is free. Ties go to the biggest setup darts, then the preferred double.
const GOOD_FINISHES = [40, 32, 16, 36, 24, 20];
const multiplierOrder = [3, 1, 2];
const setupRank = (d) => multiplierOrder.indexOf(d.multiplier) * 100 - d.value / d.multiplier;
const finishRank = (d) => (GOOD_FINISHES.includes(d.value) ? GOOD_FINISHES.indexOf(d.value) : 100 - d.value);
const setupCost = (d) => ({ 25: 3, 50: 4 })[d.value] ?? { 1: 1, 3: 2, 2: 3 }[d.multiplier];
const finishCost = (d) => (GOOD_FINISHES.includes(d.value) ? 0 : 1);

export function dartLabel({ value, multiplier }) {
  if (value === 50) return 'Bull';
  return `${{ 1: '', 2: 'D', 3: 'T' }[multiplier]}${value / multiplier}`;
}

const totalCost = (darts, start = 0) => darts.reduce((total, d) => total + setupCost(d), start);

// Straight out has no finishing double to prefer: every dart counts as setup.
function routeKey(route, last) {
  if (last === anyDart) return [totalCost(route), ...route.map(setupRank)];
  const setup = route.slice(0, -1);
  const finish = route.at(-1);
  return [totalCost(setup, finishCost(finish)), ...setup.map(setupRank), finishRank(finish)];
}

function isBetter(a, b) {
  const i = a.findIndex((x, j) => x !== b[j]);
  return i !== -1 && a[i] < b[i];
}

// cache: first predicate -> last predicate -> Map(total -> best route)
const routeCache = new Map();

function bestRoutes(first, last) {
  if (!routeCache.has(first)) routeCache.set(first, new Map());
  const byLast = routeCache.get(first);
  if (!byLast.has(last)) {
    const best = new Map();
    const opening = DARTS.filter(first);
    const setupsByLength = [[[]], opening.map((d) => [d]), opening.flatMap((d) => DARTS.map((e) => [d, e]))];
    for (const setups of setupsByLength) {
      const found = new Map();
      for (const setup of setups) {
        const setupTotal = setup.reduce((sum, d) => sum + d.value, 0);
        for (const finish of setup.length ? DARTS : opening) {
          const total = setupTotal + finish.value;
          if (best.has(total) || !last(finish)) continue;
          const route = [...setup, finish];
          const key = routeKey(route, last);
          if (!found.has(total) || isBetter(key, found.get(total).key)) found.set(total, { route, key });
        }
      }
      for (const [total, { route }] of found) best.set(total, route.map(dartLabel));
    }
    byLast.set(last, best);
  }
  return byLast.get(last);
}

// One recommended route to finish `total` exactly, as dart labels (e.g.
// ['T20', 'T20', 'Bull']); null when `total` can't be finished in 3 darts.
// Plain double out follows DartCounter's table; the rule combinations it
// doesn't cover (straight out, opening on a double) use the brute force.
export function checkoutRoute(total, { first = anyDart, last = anyDart } = {}) {
  if (first === anyDart && last === isDouble) return DOUBLE_OUT_ROUTES[total]?.split(' ') ?? null;
  return bestRoutes(first, last).get(total) ?? null;
}
