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
