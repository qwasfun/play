import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_IDS, dailyGame, parseRoute, dailySeed } from '@playground/game-registry/core';
import { createStore } from '../apps/arcade/src/storage.js';
const ids = ['windmill', 'courier', 'weave', 'jugs'];
test('Oct 28 batch: exactly four new games, append-only challenge epoch', () => {
  assert.ok(GAME_IDS.length >= 28);
  assert.deepEqual(GAME_IDS.slice(24, 28), ids);
  const previous = [
    'lantern',
    'sail',
    'balance',
    'pebble',
    'constellation',
    'tower',
    'rain',
    'mines',
    'jump',
    'bubbles',
    'slide',
    'rhythm',
    'rings',
    'snake',
    'boxes',
    'pipes',
    'catch',
    'bounce',
    'pairs',
    'merge',
    'star',
    'bridge',
    'lights',
    'echo',
  ];
  for (let n = 0; n < 28; n++) {
    const d = new Date(Date.UTC(2027, 0, 11 + n)).toISOString().slice(0, 10);
    assert.equal(dailyGame(d), previous[n % 24]);
  }
  for (let n = 0; n < 28; n++) {
    const d = new Date(Date.UTC(2027, 1, 8 + n)).toISOString().slice(0, 10),
      id = dailyGame(d);
    assert.equal(id, [...ids, ...previous][n]);
    assert.equal(parseRoute(`#/play/${id}?date=${d}&v=1`, '2027-04-01').type, 'play');
    assert.equal(dailySeed(d, id), dailySeed(d, id, 1));
  }
});
test('new records and preferences preserve old scores and campaign progress', () => {
  const m = new Map(),
    adapter = {
      getItem: (k) => m.get(k),
      setItem: (k, v) => m.set(k, v),
      removeItem: (k) => m.delete(k),
    },
    s = createStore(adapter);
  s.record('star', { score: 25, elapsed: 20, won: false });
  for (const id of ids) {
    s.toggleFavorite(id);
    s.recent(id);
    s.record(id, { score: 0, elapsed: 0, won: false });
  }
  const r = createStore(adapter);
  assert.equal(r.data.best.star.score, 25);
  assert.deepEqual(r.data.favorites, ids);
  for (const id of ids) {
    assert.ok(r.data.best[id]);
    assert.ok(r.data.recent.includes(id));
  }
});
