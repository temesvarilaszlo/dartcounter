import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeConfig, normalizeConfig, validateConfig } from '../../../../src/model/gameTypes/cricket/config.js';
import { cricketConfig } from '../../../fixtures/cricket.js';

test('regular is the default variant', () => {
  assert.deepEqual(normalizeConfig({}), { variant: 'regular' });
  assert.deepEqual(normalizeConfig({ variant: 'cutThroat' }), { variant: 'cutThroat' });
});

test('validateConfig checks the variant and the common fields', () => {
  assert.deepEqual(validateConfig(cricketConfig()), { ok: true, errors: {} });
  assert.deepEqual(validateConfig(cricketConfig({ variant: 'mickeyMouse', players: 3 })).errors, {
    players: 'Choose 1 to 2 players',
    variant: 'Choose a variant',
  });
});

test('describeConfig names the variant', () => {
  assert.equal(describeConfig(cricketConfig()), 'Regular');
  assert.equal(describeConfig(cricketConfig({ variant: 'cutThroat' })), 'Cut-throat');
});
