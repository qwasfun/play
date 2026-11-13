import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, generateTargets, LEAF_KEEPER } from '../src/index.js';
import { rules } from '../src/rules.js';

function steerToNext(game) {
  const before = game.getState();
  const key = before.target < before.position ? 'ArrowLeft' : 'ArrowRight';
  game.input('key-down', { key, repeat: false });
  for (let step = 0; step < 240 && game.getState().progress === before.progress; step++)
    game.update(0.02);
  game.input('key-up', { key });
  if (!game.getState().finished) game.update(LEAF_KEEPER.bloomTime + 0.02);
}

test('seeded targets are deterministic, bounded, alternating and varied', () => {
  const signatures = new Set();
  for (let seed = 0; seed < 300; seed++) {
    const targets = generateTargets(seed);
    assert.deepEqual(targets, generateTargets(seed));
    assert.equal(targets.length, LEAF_KEEPER.targets);
    for (const [index, target] of targets.entries()) {
      assert.ok(Math.abs(target) >= 0.28 && Math.abs(target) < 0.78);
      if (index) assert.ok(targets[index - 1] * target < 0);
    }
    signatures.add(targets.map((target) => target.toFixed(3)).join(','));
  }
  assert.ok(signatures.size > 290);
  assert.notDeepEqual(generateTargets(42), generateTargets(43));
});

test('real held keyboard input catches all twelve lights and finishes once', () => {
  const results = [];
  const game = createGame({ seed: 42, onFinish: (result) => results.push(result) });
  for (let target = 0; target < LEAF_KEEPER.targets; target++) steerToNext(game);
  assert.equal(results.length, 1);
  assert.deepEqual(results[0], {
    score: 1200,
    elapsed: results[0].elapsed,
    won: true,
    progress: 12,
    lives: 3,
  });
  assert.ok(results[0].elapsed > 8 && results[0].elapsed < 45);
  assert.deepEqual(rules.validate(results[0]), []);
  const end = game.getState();
  game.input('key-down', { key: 'ArrowLeft' });
  game.update(999);
  assert.deepEqual(game.getState(), end);
  assert.equal(results.length, 1);
});

test('pointer halves steer, moving across the leaf reverses and release or cancel stops', () => {
  const game = createGame({ seed: 3 });
  game.input('primary-down', { x: 120, y: 260 });
  game.update(0.2);
  const left = game.getState().position;
  assert.ok(left < 0);
  game.input('primary-move', { x: 480, y: 260 });
  game.update(0.4);
  assert.ok(game.getState().position > left);
  game.input('primary-up', { x: 480, y: 260 });
  const released = game.getState().position;
  game.update(0.2);
  assert.equal(game.getState().position, released);
  game.input('primary-down', { x: 480, y: 260 });
  game.input('primary-cancel');
  game.update(0.2);
  assert.equal(game.getState().position, released);
});

test('invalid pointer input is ignored and pointer only acts during balance phase', () => {
  const game = createGame({ seed: 9 });
  for (const point of [{}, { x: NaN, y: 20 }, { x: -1, y: 20 }, { x: 601, y: 20 }]) {
    game.input('primary-down', point);
    game.input('primary-move', point);
    game.input('primary-up', point);
  }
  game.update(0.2);
  assert.equal(game.getState().position, 0);
  steerToNext(game);
  assert.equal(game.getState().phase, 'balance');
  assert.equal(game.getState().progress, 1);
});

test('keyboard repeats do not latch and opposed directions cancel until one is released', () => {
  const game = createGame({ seed: 17 });
  game.input('key-down', { key: 'ArrowRight', repeat: true });
  game.input('key-down', { key: 'x', repeat: false });
  game.update(0.2);
  assert.equal(game.getState().position, 0);
  game.input('key-down', { key: 'ArrowRight', repeat: false });
  game.input('key-down', { key: 'a', repeat: false });
  game.update(0.2);
  assert.equal(game.getState().position, 0);
  game.input('key-up', { key: 'a' });
  game.update(0.2);
  assert.ok(game.getState().position > 0);
  game.input('primary-cancel');
  const stopped = game.getState().position;
  game.update(0.2);
  assert.equal(game.getState().position, stopped);
});

test('sliding beyond either leaf edge costs a life and resets at the center', () => {
  const game = createGame({ seed: 5 });
  const key = game.getState().target < 0 ? 'ArrowRight' : 'ArrowLeft';
  game.input('key-down', { key, repeat: false });
  game.update(1.6);
  assert.equal(game.getState().lives, 2);
  assert.equal(game.getState().phase, 'reset');
  game.update(LEAF_KEEPER.resetTime + 0.02);
  assert.equal(game.getState().position, 0);
  assert.equal(game.getState().phase, 'balance');
});

test('three target timeouts end once with a valid loss', () => {
  const results = [];
  const game = createGame({ seed: 2, onFinish: (result) => results.push(result) });
  for (let miss = 0; miss < 3; miss++) {
    game.update(LEAF_KEEPER.targetTime + 0.02);
    if (miss < 2) game.update(LEAF_KEEPER.resetTime + 0.02);
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

test('invalid time is ignored, sixty-second timeout clamps and destroy stays silent', () => {
  const timed = [];
  const game = createGame({ seed: 4, onFinish: (result) => timed.push(result) });
  for (const dt of [NaN, Infinity, -1, 0]) game.update(dt);
  assert.equal(game.getState().elapsed, 0);
  game.input('key-down', { key: 'ArrowLeft', repeat: false });
  game.update(999);
  assert.equal(timed.length, 1);
  assert.ok(timed[0].lives === 0 || timed[0].elapsed === LEAF_KEEPER.limit);
  assert.deepEqual(rules.validate(timed[0]), []);

  const destroyed = [];
  const quiet = createGame({ seed: 1, onFinish: (result) => destroyed.push(result) });
  quiet.destroy();
  quiet.update(999);
  quiet.input('key-down', { key: 'ArrowRight' });
  assert.equal(destroyed.length, 0);
});

test('ranked rules reject forged scores, counters, wins and unfinished losses', () => {
  const good = { score: 1200, elapsed: 20, won: true, progress: 12, lives: 2 };
  assert.deepEqual(rules.validate(good), []);
  for (const bad of [
    { ...good, score: 1100 },
    { ...good, score: 1150 },
    { ...good, progress: 11 },
    { ...good, lives: 0 },
    { ...good, won: false },
    { ...good, elapsed: 0.2 },
    { ...good, elapsed: 61 },
    { score: 400, elapsed: 30, won: false, progress: 4, lives: 2 },
  ])
    assert.ok(rules.validate(bad).length, JSON.stringify(bad));
  assert.deepEqual(rules.clean({ ...good, secret: 'drop' }), good);
});
