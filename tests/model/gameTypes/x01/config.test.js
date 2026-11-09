import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeConfig, normalizeConfig, preGameSchema, validateConfig } from '../../../../src/model/gameTypes/x01/config.js';
import { x01Config } from '../../../fixtures/x01.js';

test('defaults are 501, straight in, double out', () => {
  assert.deepEqual(normalizeConfig({}), { startScore: 501, inRule: 'straight', outRule: 'double' });
  assert.deepEqual(Object.fromEntries(preGameSchema.map((f) => [f.key, f.default])), {
    startScore: 501, inRule: 'straight', outRule: 'double',
  });
});

test('normalizeConfig parses a custom start score typed on the keypad', () => {
  assert.deepEqual(normalizeConfig({ startScore: '1001', inRule: 'double' }), {
    startScore: 1001, inRule: 'double', outRule: 'double',
  });
});

test('start score options are the standard ones', () => {
  assert.deepEqual(preGameSchema[0].options.map((o) => o.value), [101, 201, 301, 401, 501, 601, 701, 801, 901]);
});

test('validateConfig accepts a valid config and reports every bad field', () => {
  assert.deepEqual(validateConfig(x01Config()), { ok: true, errors: {} });
  assert.deepEqual(validateConfig(x01Config({ startScore: 2 })).ok, true);
  assert.deepEqual(validateConfig(x01Config({ startScore: 1001 })).ok, true);

  const { ok, errors } = validateConfig(x01Config({ startScore: 1002, inRule: 'triple', outRule: 'master', players: 3 }));
  assert.equal(ok, false);
  assert.deepEqual(Object.keys(errors).sort(), ['inRule', 'outRule', 'players', 'startScore']);
  assert.equal(validateConfig(x01Config({ startScore: 1 })).errors.startScore, 'Start score must be 2 to 1001');
  assert.equal(validateConfig(x01Config({ startScore: '501' })).ok, false);
});

test('describeConfig only mentions the in rule when it is not straight', () => {
  assert.equal(describeConfig(x01Config()), '501 · Double out');
  assert.equal(describeConfig(x01Config({ startScore: 301, inRule: 'double' })), '301 · Double in · Double out');
  assert.equal(describeConfig(x01Config({ outRule: 'straight' })), '501 · Straight out');
});
