import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTES, matchRoute } from '../../src/controllers/router.js';

test('empty hash and #/ resolve to the menu', () => {
  for (const hash of ['', '#', '#/']) {
    assert.deepEqual(matchRoute(ROUTES, hash), { name: 'menu', params: {}, query: {} });
  }
});

test('extracts and decodes route params', () => {
  assert.deepEqual(matchRoute(ROUTES, '#/new/x01').params, { typeId: 'x01' });
  assert.deepEqual(matchRoute(ROUTES, '#/games/a%20b').params, { id: 'a b' });
});

test('parses the query string', () => {
  const route = matchRoute(ROUTES, '#/stats?tab=history');
  assert.equal(route.name, 'stats');
  assert.deepEqual(route.query, { tab: 'history' });
});

test('unknown paths, extra segments and malformed params do not match', () => {
  assert.equal(matchRoute(ROUTES, '#/nope'), null);
  assert.equal(matchRoute(ROUTES, '#/game/extra'), null);
  assert.equal(matchRoute(ROUTES, '#/games/%E0%A4%A'), null);
});
