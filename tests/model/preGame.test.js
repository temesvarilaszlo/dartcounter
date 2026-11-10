import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultForm, movePlayer, prepareGame, rematchForm, restoreForm, suggestPlayers, validateForm,
} from '../../src/model/preGame.js';
import { createLastConfigStore } from '../../src/model/persistence/activeGameStore.js';
import { x01 } from '../../src/model/gameTypes/x01/index.js';
import { cricket } from '../../src/model/gameTypes/cricket/index.js';
import { memoryStorage, player } from '../fixtures/persistence.js';
import { fixedClock, sequentialIds } from '../fixtures/x01.js';

const named = (...names) => names.map((name) => ({ name }));
const withPlayers = (type, ...names) => ({ ...defaultForm(type), players: named(...names) });
const deps = { newId: sequentialIds('p'), now: fixedClock() };

test('default form: two empty player rows, first to 3 legs, the type defaults', () => {
  assert.deepEqual(defaultForm(x01), {
    players: named('', ''),
    sets: { enabled: false, format: { mode: 'firstTo', value: 2 }, legsToWinSet: 3 },
    legs: { format: { mode: 'firstTo', value: 3 } },
    typeConfig: { startScore: 501, inRule: 'straight', outRule: 'double' },
  });
  assert.deepEqual(defaultForm(cricket).typeConfig, { variant: 'regular' });
});

test('the default form is invalid until names are entered', () => {
  const { ok, playerErrors, errors } = validateForm(x01, defaultForm(x01));
  assert.equal(ok, false);
  assert.deepEqual(playerErrors, ['Enter a name', 'Enter a name']);
  assert.deepEqual(errors, {});
  assert.equal(validateForm(x01, withPlayers(x01, 'Alice', 'Bob')).ok, true);
  assert.equal(validateForm(x01, withPlayers(x01, 'Alice')).ok, true, 'solo');
});

test('validation covers duplicates, player count, match format and type fields', () => {
  assert.deepEqual(validateForm(x01, withPlayers(x01, 'Alice', ' alice ')).playerErrors, [null, 'Name already used in this game']);
  assert.equal(validateForm(x01, withPlayers(x01)).errors.players, 'Choose 1 to 2 players');
  assert.equal(validateForm(x01, withPlayers(x01, 'A', 'B', 'C')).errors.players, 'Choose 1 to 2 players');
  const form = withPlayers(x01, 'Alice');
  const bad = {
    ...form,
    sets: { enabled: true, format: { mode: 'bestOf', value: 2 }, legsToWinSet: 0 },
    typeConfig: { ...form.typeConfig, startScore: 1 },
  };
  assert.deepEqual(validateForm(x01, bad).errors, {
    'sets.format': 'Best of must be an odd number',
    'sets.legsToWinSet': 'Must be at least 1',
    startScore: 'Start score must be 2 to 1001',
  });
});

test('lastConfig round-trip keeps players, their order and the whole setup', () => {
  const form = {
    players: named('Bob', 'Alice'),
    sets: { enabled: true, format: { mode: 'bestOf', value: 3 }, legsToWinSet: 2 },
    legs: { format: { mode: 'bestOf', value: 5 } },
    typeConfig: { startScore: 777, inRule: 'double', outRule: 'straight' },
  };
  const store = createLastConfigStore(memoryStorage());
  store.set('x01', form);
  assert.deepEqual(restoreForm(x01, store.get('x01')), form);
});

test('restoring keeps what is usable and defaults the rest', () => {
  assert.deepEqual(restoreForm(x01, null), defaultForm(x01));
  const restored = restoreForm(x01, {
    players: [{ name: '  Cid ' }, { name: '' }, null, { name: 'Dee' }, { name: 'Eve' }],
    sets: { enabled: true },
    legs: { format: { mode: 'bestOf', value: 4 } },
    typeConfig: { startScore: 5000, inRule: 'double', outRule: 'master' },
  });
  assert.deepEqual(restored.players, named('Cid', 'Dee'));
  assert.deepEqual(restored.sets, defaultForm(x01).sets);
  assert.deepEqual(restored.legs, defaultForm(x01).legs);
  assert.deepEqual(restored.typeConfig, { startScore: 501, inRule: 'double', outRule: 'double' });
  assert.deepEqual(restoreForm(x01, { players: [] }).players, named('', ''));
});

test('starting resolves names to existing or new players in throw order', () => {
  const alice = player('a', 'Alice');
  const form = withPlayers(x01, 'Zed', 'ALICE');
  const { config, players, created } = prepareGame(x01, form, [alice], deps);
  assert.deepEqual(players.map((p) => p.name), ['Zed', 'Alice']);
  assert.deepEqual(created.map((p) => p.name), ['Zed']);
  assert.deepEqual(config.playerIds, [created[0].id, 'a']);
  assert.equal(config.startingPlayerIndex, 0);
  assert.equal(x01.validateConfig(config).ok, true);
  config.typeConfig.startScore = 1;
  assert.equal(form.typeConfig.startScore, 501, 'config is a copy of the form');
  assert.throws(() => prepareGame(x01, defaultForm(x01), [], deps), /not valid/);
});

test('moving players swaps neighbours and ignores moves past the ends', () => {
  const list = named('A', 'B', 'C');
  assert.deepEqual(movePlayer(list, 0, 1), named('B', 'A', 'C'));
  assert.deepEqual(movePlayer(list, 2, -1), named('A', 'C', 'B'));
  assert.equal(movePlayer(list, 0, -1), list);
  assert.equal(movePlayer(list, 2, 1), list);
});

test('suggestions leave out players already in the form, sorted by name', () => {
  const existing = [player('c', 'Carol'), player('a', 'Alice'), player('b', 'Bob')];
  assert.deepEqual(suggestPlayers(existing, withPlayers(x01, 'bob', '')).map((p) => p.name), ['Alice', 'Carol']);
});

test('rematch: same setup with the player order rotated by one', () => {
  const alice = player('a', 'Alice');
  const bob = player('b', 'Bob');
  const carol = player('c', 'Carol');
  const game = {
    config: {
      playerIds: ['a', 'b', 'c'],
      startingPlayerIndex: 0,
      sets: { enabled: true, format: { mode: 'bestOf', value: 3 }, legsToWinSet: 2 },
      legs: { format: { mode: 'firstTo', value: 1 } },
      typeConfig: { startScore: 777, inRule: 'double', outRule: 'straight' },
    },
  };
  const form = rematchForm(x01, game, [carol, alice, bob]);
  assert.deepEqual(form.players, named('Bob', 'Carol', 'Alice').slice(0, form.players.length));
  assert.deepEqual(form.sets, game.config.sets);
  assert.deepEqual(form.typeConfig, game.config.typeConfig);
  assert.deepEqual(rematchForm(x01, { config: { ...game.config, playerIds: ['a', 'b'] } }, [alice, bob]).players, named('Bob', 'Alice'));
});
