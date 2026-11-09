import test from 'node:test';
import assert from 'node:assert/strict';
import {
  colorAtDirection,
  createGame,
  generateDrops,
  PETAL_WHEEL,
  responseWindow,
} from '../src/index.js';
import { rules } from '../src/rules.js';

function alignWithKeyboard(game) {
  const state = game.getState();
  while (colorAtDirection(game.getState().rotation, state.drop.direction) !== state.drop.color)
    game.input('key-down', { key: 'ArrowRight', repeat: false });
}

function catchNext(game) {
  const before = game.getState().progress;
  alignWithKeyboard(game);
  game.update(responseWindow(before) + 0.02);
  if (!game.getState().finished) game.update(PETAL_WHEEL.bloomTime + 0.02);
}

test('seeded drops are deterministic, varied and avoid immediate direction or color repeats', () => {
  const signatures = new Set();
  for (let seed = 0; seed < 300; seed++) {
    const drops = generateDrops(seed);
    assert.deepEqual(drops, generateDrops(seed));
    assert.equal(drops.length, PETAL_WHEEL.total);
    for (const [index, drop] of drops.entries()) {
      assert.ok(drop.direction >= 0 && drop.direction < 4);
      assert.ok(drop.color >= 0 && drop.color < 4);
      if (index) {
        assert.notEqual(drop.direction, drops[index - 1].direction);
        assert.notEqual(drop.color, drops[index - 1].color);
      }
    }
    signatures.add(drops.map(({ direction, color }) => `${direction}${color}`).join(''));
  }
  assert.ok(signatures.size > 290);
  assert.notDeepEqual(generateDrops(42), generateDrops(43));
});

test('color lookup follows clockwise quarter turns', () => {
  assert.deepEqual(
    [0, 1, 2, 3].map((direction) => colorAtDirection(0, direction)),
    [0, 1, 2, 3],
  );
  assert.deepEqual(
    [0, 1, 2, 3].map((direction) => colorAtDirection(1, direction)),
    [3, 0, 1, 2],
  );
  assert.deepEqual(
    [0, 1, 2, 3].map((direction) => colorAtDirection(-1, direction)),
    [1, 2, 3, 0],
  );
});

test('real keyboard rotations catch twenty drops and finish once', () => {
  const results = [];
  const game = createGame({ seed: 42, onFinish: (result) => results.push(result) });
  for (let drop = 0; drop < PETAL_WHEEL.total; drop++) catchNext(game);
  assert.equal(results.length, 1);
  assert.deepEqual(results[0], {
    score: 1200,
    elapsed: results[0].elapsed,
    won: true,
    progress: 20,
    lives: 3,
  });
  assert.ok(results[0].elapsed > 20 && results[0].elapsed < 50);
  assert.deepEqual(rules.validate(results[0]), []);
  const end = game.getState();
  game.input('key-down', { key: 'ArrowLeft' });
  game.update(999);
  assert.deepEqual(game.getState(), end);
  assert.equal(results.length, 1);
});

test('pointer halves rotate left and right while invalid points and key repeats are ignored', () => {
  const game = createGame({ seed: 8 });
  game.input('primary-down', { x: 100, y: 240 });
  assert.equal(game.getState().rotation, 3);
  game.input('primary-down', { x: 500, y: 240 });
  assert.equal(game.getState().rotation, 0);
  for (const point of [{}, { x: NaN, y: 20 }, { x: -1, y: 20 }, { x: 601, y: 20 }])
    game.input('primary-down', point);
  game.input('key-down', { key: 'ArrowRight', repeat: true });
  game.input('key-down', { key: 'x', repeat: false });
  assert.equal(game.getState().rotation, 0);
  game.input('key-down', { key: 'a', repeat: false });
  game.input('key-down', { key: 'd', repeat: false });
  assert.equal(game.getState().rotation, 0);
});

test('input is locked during bloom and reset transitions', () => {
  const game = createGame({ seed: 11 });
  alignWithKeyboard(game);
  game.update(responseWindow(0) + 0.01);
  assert.equal(game.getState().phase, 'bloom');
  const rotation = game.getState().rotation;
  game.input('primary-down', { x: 500, y: 240 });
  game.input('key-down', { key: 'ArrowLeft', repeat: false });
  assert.equal(game.getState().rotation, rotation);
});

test('wrong petals cost lives and three misses finish with a valid loss', () => {
  const results = [];
  const game = createGame({ seed: 4, onFinish: (result) => results.push(result) });
  for (let miss = 0; miss < 3; miss++) {
    const state = game.getState();
    while (colorAtDirection(game.getState().rotation, state.drop.direction) === state.drop.color)
      game.input('key-down', { key: 'ArrowRight', repeat: false });
    game.update(responseWindow(state.progress) + 0.02);
    if (miss < 2) game.update(PETAL_WHEEL.resetTime + 0.02);
  }
  assert.equal(results.length, 1);
  assert.deepEqual(results[0], {
    score: 0,
    elapsed: results[0].elapsed,
    won: false,
    progress: 0,
    lives: 0,
  });
  assert.deepEqual(rules.validate(results[0]), []);
});

test('invalid time is ignored, global timeout clamps and destroy stays silent', () => {
  const timed = [];
  const game = createGame({ seed: 9, onFinish: (result) => timed.push(result) });
  for (const dt of [NaN, Infinity, -1, 0]) game.update(dt);
  assert.equal(game.getState().elapsed, 0);
  game.update(999);
  assert.equal(timed.length, 1);
  assert.ok(timed[0].lives === 0 || timed[0].elapsed === PETAL_WHEEL.limit);
  assert.deepEqual(rules.validate(timed[0]), []);

  const destroyed = [];
  const quiet = createGame({ seed: 1, onFinish: (result) => destroyed.push(result) });
  quiet.destroy();
  quiet.update(999);
  quiet.input('key-down', { key: 'ArrowRight' });
  assert.equal(destroyed.length, 0);
});

test('ranked rules reject forged score, counters, wins and unfinished losses', () => {
  const good = { score: 1200, elapsed: 30, won: true, progress: 20, lives: 2 };
  assert.deepEqual(rules.validate(good), []);
  for (const bad of [
    { ...good, score: 1140 },
    { ...good, score: 1190 },
    { ...good, progress: 19 },
    { ...good, lives: 0 },
    { ...good, won: false },
    { ...good, elapsed: 2 },
    { ...good, elapsed: 76 },
    { score: 240, elapsed: 30, won: false, progress: 4, lives: 2 },
  ])
    assert.ok(rules.validate(bad).length, JSON.stringify(bad));
  assert.deepEqual(rules.clean({ ...good, secret: 'drop' }), good);
});
