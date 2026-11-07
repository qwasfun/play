import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUTTERFLY_CHASE,
  createGame,
  generateGarden,
  responseWindow,
  TRAITS,
} from '../src/index.js';
import { rules } from '../src/rules.js';

function targetPoint(seed, progress) {
  const garden = generateGarden(seed, progress);
  return garden.butterflies.find((butterfly) => butterfly.id === garden.target);
}

function solve(game, seed) {
  for (let progress = 0; progress < BUTTERFLY_CHASE.total; progress++) {
    game.input('primary-down', targetPoint(seed, progress));
    if (!game.getState().finished) game.update(BUTTERFLY_CHASE.bloomTime + 0.02);
  }
}

test('seeded gardens are deterministic, separated, bounded and varied', () => {
  const signatures = new Set();
  for (let seed = 0; seed < 250; seed++) {
    const garden = generateGarden(seed, seed % BUTTERFLY_CHASE.total);
    assert.deepEqual(garden, generateGarden(seed, seed % BUTTERFLY_CHASE.total));
    assert.equal(garden.butterflies.length, BUTTERFLY_CHASE.butterflies);
    assert.equal(new Set(garden.butterflies.map(({ id }) => id)).size, TRAITS.length);
    assert.ok(garden.butterflies.some(({ id }) => id === garden.target));
    for (const butterfly of garden.butterflies) {
      assert.ok(butterfly.x >= 110 && butterfly.x <= 490);
      assert.ok(butterfly.y >= 130 && butterfly.y <= 320);
      assert.ok(Number.isFinite(butterfly.vx) && Number.isFinite(butterfly.vy));
    }
    signatures.add(`${garden.target}:${garden.butterflies.map(({ id }) => id).join('')}`);
  }
  assert.ok(signatures.size > 80);
  assert.notDeepEqual(generateGarden(41, 0), generateGarden(42, 0));
});

test('real pointer catches complete twelve rounds once with a ranked score', () => {
  const results = [];
  const game = createGame({ seed: 42, onFinish: (result) => results.push(result) });
  solve(game, 42);
  assert.equal(results.length, 1);
  assert.deepEqual(results[0], {
    score: 1200,
    elapsed: results[0].elapsed,
    won: true,
    progress: 12,
    lives: 3,
  });
  assert.ok(results[0].elapsed > 4 && results[0].elapsed < 20);
  assert.deepEqual(rules.validate(results[0]), []);
  const ended = game.getState();
  game.input('primary-down', targetPoint(42, 0));
  game.update(999);
  assert.deepEqual(game.getState(), ended);
  assert.equal(results.length, 1);
});

test('keyboard movement and space capture use the same flower ring', () => {
  const game = createGame({ seed: 11 });
  game.input('key-down', { key: 'ArrowLeft', repeat: false });
  game.input('key-down', { key: 'w', repeat: false });
  game.update(0.2);
  game.input('key-up', { key: 'ArrowLeft' });
  game.input('key-up', { key: 'w' });
  assert.ok(game.getState().net.x < 300 && game.getState().net.y < 405);
  const target = targetPoint(11, 0);
  game.input('primary-move', target);
  game.input('key-down', { key: ' ', repeat: false });
  assert.equal(game.getState().progress, 1);
  assert.equal(game.getState().score, 100);
});

test('key repeats, unrelated keys, opposed movement and bounds are safe', () => {
  const game = createGame({ seed: 3 });
  game.input('key-down', { key: 'ArrowLeft', repeat: true });
  game.input('key-down', { key: 'x', repeat: false });
  game.update(0.2);
  assert.equal(game.getState().net.x, 300);
  game.input('key-down', { key: 'ArrowLeft', repeat: false });
  game.input('key-down', { key: 'd', repeat: false });
  game.update(0.2);
  assert.equal(game.getState().net.x, 300);
  game.input('key-up', { key: 'd' });
  game.update(5);
  assert.equal(game.getState().net.x, 42);
  game.input('primary-cancel');
  const stopped = game.getState().net.x;
  game.update(0.1);
  assert.equal(game.getState().net.x, stopped);
});

test('wrong butterfly and empty flower-ring attempts cost opportunities and end', () => {
  const results = [];
  const game = createGame({ seed: 8, onFinish: (result) => results.push(result) });
  for (let miss = 0; miss < BUTTERFLY_CHASE.lives; miss++) {
    const state = game.getState();
    const wrong = state.butterflies.find(({ id }) => id !== state.target);
    game.input('primary-down', wrong);
    if (miss < BUTTERFLY_CHASE.lives - 1) game.update(BUTTERFLY_CHASE.resetTime + 0.02);
  }
  assert.equal(results.length, 1);
  assert.equal(results[0].lives, 0);
  assert.equal(results[0].progress, 0);
  assert.equal(results[0].won, false);
  assert.deepEqual(rules.validate(results[0]), []);

  const empty = createGame({ seed: 8 });
  empty.input('primary-down', { x: 300, y: 440 });
  assert.equal(empty.getState().lives, 2);
  assert.match(empty.getState().hint, /落空/);
});

test('response time tightens and three round timeouts form a valid loss', () => {
  for (let progress = 1; progress < BUTTERFLY_CHASE.total; progress++)
    assert.ok(responseWindow(progress) < responseWindow(progress - 1));
  const results = [];
  const game = createGame({ seed: 2, onFinish: (result) => results.push(result) });
  for (let miss = 0; miss < BUTTERFLY_CHASE.lives; miss++) {
    game.update(responseWindow(0) + 0.02);
    if (miss < BUTTERFLY_CHASE.lives - 1) game.update(BUTTERFLY_CHASE.resetTime + 0.02);
  }
  assert.equal(results.length, 1);
  assert.equal(results[0].lives, 0);
  assert.deepEqual(rules.validate(results[0]), []);
});

test('butterflies bounce in bounds and returned state cannot mutate the engine', () => {
  const game = createGame({ seed: 19 });
  const copy = game.getState();
  copy.net.x = -99;
  copy.butterflies[0].x = -99;
  game.update(2.5);
  const state = game.getState();
  assert.ok(state.net.x >= 42);
  for (const butterfly of state.butterflies) {
    assert.ok(butterfly.x >= 64 && butterfly.x <= 536);
    assert.ok(butterfly.y >= 112 && butterfly.y <= 344);
  }
});

test('invalid points and time are ignored while destroy stays silent', () => {
  const results = [];
  const game = createGame({ seed: 5, onFinish: (result) => results.push(result) });
  for (const point of [{}, { x: NaN, y: 20 }, { x: -1, y: 20 }, { x: 601, y: 20 }]) {
    game.input('primary-down', point);
    game.input('primary-move', point);
  }
  for (const dt of [NaN, Infinity, -1, 0]) game.update(dt);
  assert.equal(game.getState().elapsed, 0);
  assert.equal(game.getState().lives, 3);
  game.destroy();
  game.update(999);
  game.input('key-down', { key: ' ' });
  assert.equal(results.length, 0);
});

test('ranked rules reject forged scores, counters, wins and unfinished losses', () => {
  const good = { score: 1200, elapsed: 8, won: true, progress: 12, lives: 2 };
  assert.deepEqual(rules.validate(good), []);
  for (const bad of [
    { ...good, score: 1100 },
    { ...good, score: 1150 },
    { ...good, progress: 11 },
    { ...good, lives: 0 },
    { ...good, won: false },
    { ...good, elapsed: 2 },
    { ...good, elapsed: 76 },
    { score: 400, elapsed: 20, won: false, progress: 4, lives: 2 },
  ])
    assert.ok(rules.validate(bad).length, JSON.stringify(bad));
  assert.deepEqual(rules.clean({ ...good, secret: 'drop' }), good);
});
