import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countBuckets, maxOrNull, minOrNull, pooledAverage, sum } from '../../../src/model/common/statsMath.js';

test('pooled average is points / darts x 3, not the mean of leg averages', () => {
  // 501 in 15 darts (100.2) and 501 in 30 darts (50.1): mean 75.15, pooled 66.8
  assert.equal(pooledAverage(501, 15).toFixed(2), '100.20');
  assert.equal(pooledAverage(501, 30).toFixed(2), '50.10');
  assert.equal(pooledAverage(1002, 45).toFixed(2), '66.80');
});

test('pooled average with no darts is null', () => {
  assert.equal(pooledAverage(0, 0), null);
});

test('sum, max and min helpers', () => {
  assert.equal(sum([]), 0);
  assert.equal(sum([1, 2, 3]), 6);
  assert.equal(maxOrNull([]), null);
  assert.equal(maxOrNull([3, 9, 1]), 9);
  assert.equal(minOrNull([]), null);
  assert.equal(minOrNull([3, 9, 1]), 1);
});

test('countBuckets uses inclusive bounds and ignores values outside every bucket', () => {
  const buckets = [{ key: 'low', min: 0, max: 9 }, { key: 'high', min: 10, max: 19 }];
  assert.deepEqual(countBuckets([0, 9, 10, 19, 20], buckets), { low: 2, high: 2 });
  assert.deepEqual(countBuckets([], buckets), { low: 0, high: 0 });
});
