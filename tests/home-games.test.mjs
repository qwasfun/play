import test from 'node:test';
import assert from 'node:assert/strict';
import { newestGamesFirst } from '../apps/arcade/src/home-games.js';

test('homepage games are newest first without changing registry order', () => {
  const games = [{ id: 'oldest' }, { id: 'middle' }, { id: 'newest' }];

  assert.deepEqual(
    newestGamesFirst(games).map((game) => game.id),
    ['newest', 'middle', 'oldest'],
  );
  assert.deepEqual(
    games.map((game) => game.id),
    ['oldest', 'middle', 'newest'],
  );
});

test('category filters retain newest-first order', () => {
  const games = [
    { id: 'old-action', tag: '动手' },
    { id: 'puzzle', tag: '动脑' },
    { id: 'new-action', tag: '动手' },
  ];

  assert.deepEqual(
    newestGamesFirst(games)
      .filter((game) => game.tag === '动手')
      .map((game) => game.id),
    ['new-action', 'old-action'],
  );
});
