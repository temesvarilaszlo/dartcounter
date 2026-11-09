import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFields, validateCommonConfig, validateFields } from '../../../src/model/common/gameConfig.js';
import { matchConfig } from '../../fixtures/x01.js';

test('a valid common config has no errors', () => {
  assert.deepEqual(validateCommonConfig(matchConfig()), {});
  assert.deepEqual(validateCommonConfig(matchConfig({ players: 1 })), {});
  assert.deepEqual(validateCommonConfig(matchConfig({ sets: { format: { mode: 'bestOf', value: 5 }, legsToWinSet: 3 } })), {});
});

test('player count is limited by MAX_PLAYERS and players must be distinct', () => {
  assert.equal(validateCommonConfig({ ...matchConfig(), playerIds: [] }).players, 'Choose 1 to 2 players');
  assert.equal(validateCommonConfig(matchConfig({ players: 3 })).players, 'Choose 1 to 2 players');
  assert.deepEqual(validateCommonConfig(matchConfig({ players: 3 }), 3), {});
  assert.equal(validateCommonConfig({ ...matchConfig(), playerIds: ['a', 'a'] }).players, 'Each player can only play once');
  assert.equal(validateCommonConfig({ ...matchConfig(), playerIds: undefined }).players, 'Choose 1 to 2 players');
});

test('the first player in the list always throws first', () => {
  assert.ok(validateCommonConfig({ ...matchConfig(), startingPlayerIndex: 1 }).startingPlayerIndex);
});

test('format errors are keyed by field', () => {
  assert.deepEqual(validateCommonConfig(matchConfig({ legs: { mode: 'bestOf', value: 2 } })), {
    'legs.format': 'Best of must be an odd number',
  });
  assert.deepEqual(validateCommonConfig(matchConfig({ sets: { format: { mode: 'bestOf', value: 2 }, legsToWinSet: 0 } })), {
    'sets.format': 'Best of must be an odd number',
    'sets.legsToWinSet': 'Must be at least 1',
  });
  assert.deepEqual(validateCommonConfig({ ...matchConfig(), legs: undefined }), { 'legs.format': 'Choose first to or best of' });
});

const schema = [
  { key: 'n', default: '5', parse: Number, validate: (v) => (v > 0 ? null : 'too small') },
  { key: 'mode', default: 'a', validate: (v) => (v === 'a' || v === 'b' ? null : 'bad mode') },
];

test('schema fields validate and normalize with defaults and parsers', () => {
  assert.deepEqual(validateFields(schema, { n: 1, mode: 'b' }), {});
  assert.deepEqual(validateFields(schema, { n: 0, mode: 'c' }), { n: 'too small', mode: 'bad mode' });
  assert.deepEqual(validateFields(schema), { n: 'too small', mode: 'bad mode' });
  assert.deepEqual(normalizeFields(schema, { n: '12' }), { n: 12, mode: 'a' });
  assert.deepEqual(normalizeFields(schema), { n: 5, mode: 'a' });
});
