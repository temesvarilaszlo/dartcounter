import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nameError, nameKey, normalizeName, resolvePlayers, rotateOrder, validatePlayerNames,
} from '../../../src/model/common/players.js';
import { fixedClock, sequentialIds } from '../../fixtures/x01.js';

test('names are trimmed and keyed case-insensitively', () => {
  assert.equal(normalizeName('  Alice  '), 'Alice');
  assert.equal(normalizeName(undefined), '');
  assert.equal(nameKey('  ALice '), 'alice');
});

test('name length is 1 to 20 characters after trimming', () => {
  assert.equal(nameError('   '), 'Enter a name');
  assert.equal(nameError('a'), null);
  assert.equal(nameError(' ' + 'x'.repeat(20) + ' '), null);
  assert.equal(nameError('x'.repeat(21)), 'Max 20 characters');
});

test('duplicate names within a game are flagged on the later entry', () => {
  assert.deepEqual(validatePlayerNames(['Alice', 'alice ', '', 'Bob']), [
    null, 'Name already used in this game', 'Enter a name', null,
  ]);
});

test('resolvePlayers reuses existing players with their stored casing and creates the rest', () => {
  const existing = [{ id: 'old', name: 'Alice', nameKey: 'alice', createdAt: 'x', schemaVersion: 1 }];
  const { players, created } = resolvePlayers([' ALICE', 'Bob', 'bob'], existing, {
    newId: sequentialIds('player'),
    now: fixedClock(),
  });
  assert.equal(players[0], existing[0]);
  assert.deepEqual(created, [{
    id: 'player-1', name: 'Bob', nameKey: 'bob', createdAt: '2026-11-09T20:00:01.000Z', schemaVersion: 1,
  }]);
  assert.equal(players[2], created[0]);
});

test('rematch rotation moves the first player to the end', () => {
  assert.deepEqual(rotateOrder(['A', 'B']), ['B', 'A']);
  assert.deepEqual(rotateOrder(['A', 'B', 'C']), ['B', 'C', 'A']);
  assert.deepEqual(rotateOrder(['A']), ['A']);
  assert.deepEqual(rotateOrder([]), []);
});
