// Pooled: total points over total darts, never the mean of per-leg averages.
export function pooledAverage(points, darts) {
  return darts > 0 ? (points / darts) * 3 : null;
}

export function sum(values) {
  return values.reduce((total, v) => total + v, 0);
}

export function maxOrNull(values) {
  return values.length ? Math.max(...values) : null;
}

export function minOrNull(values) {
  return values.length ? Math.min(...values) : null;
}

// buckets: [{ key, min, max }] with inclusive bounds; returns { [key]: count }.
export function countBuckets(values, buckets) {
  const counts = Object.fromEntries(buckets.map((b) => [b.key, 0]));
  for (const value of values) {
    const bucket = buckets.find((b) => value >= b.min && value <= b.max);
    if (bucket) counts[bucket.key] += 1;
  }
  return counts;
}
