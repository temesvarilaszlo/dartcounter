import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDay } from '../../../src/model/common/dates.js';

test('localDay uses the local calendar day of a Date or an ISO string', () => {
  assert.equal(localDay(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  assert.equal(localDay(new Date(2026, 10, 10, 0, 0).toISOString()), '2026-11-10');
});
