import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  generateCourse,
  phaseDistance,
  releaseWindow,
  swingPoint,
  timeToPhase,
  validPoint,
  VINE_SWING,
} from '../src/index.js';
import { rules } from '../src/rules.js';

function advanceToRelease(game) {
  const state = game.getState();
  game.update(timeToPhase(state.phase, state.releasePhase));
}

function transfer(game, type = 'key-down') {
  advanceToRelease(game);
  if (type === 'primary-down') game.input(type, { x: 300, y: 240 });
  else game.input(type, { key: ' ', repeat: false });
  if (!game.getState().finished) game.update(VINE_SWING.flightTime);
}

test('seeded vine courses are deterministic, bounded and change direction', () => {
  const signatures = new Set();
  for (let seed = 0; seed < 240; seed++) {
    const course = generateCourse(seed);
    assert.deepEqual(course, generateCourse(seed));
    assert.equal(course.anchors.length, VINE_SWING.total + 1);
    assert.equal(course.transfers.length, VINE_SWING.total);
    assert.ok(
      course.anchors.every(
        ({ x, y, length }) =>
          x >= 118 && x <= 482 && y >= 92 && y <= 146 && length >= 122 && length <= 154,
      ),
    );
    assert.ok(new Set(course.transfers.map(({ direction }) => direction)).size === 2);
    for (const item of course.transfers) {
      assert.equal(item.releasePhase, item.direction > 0 ? 0 : 0.5);
      assert.ok(Math.abs(item.next.x - item.anchor.x) >= 85);
    }
    signatures.add(course.anchors.map(({ x, y, length }) => `${x}:${y}:${length}`).join('|'));
  }
  assert.ok(signatures.size > 230);
  assert.notDeepEqual(generateCourse(42), generateCourse(43));
});

test('release window tightens gently and circular phase helpers stay correct', () => {
  assert.equal(releaseWindow(0), 0.095);
  assert.ok(releaseWindow(9) < releaseWindow(0));
  assert.ok(releaseWindow(9) >= 0.055);
  assert.equal(phaseDistance(0.98, 0.02), 0.040000000000000036);
  assert.equal(phaseDistance(0.25, 0.75), 0.5);
  assert.ok(Math.abs(timeToPhase(0.8, 0.1) - 0.42) < 1e-9);
  assert.deepEqual(swingPoint({ x: 300, y: 100, length: 140 }, 0), { x: 300, y: 240 });
});

test('real release keys complete ten transfers and finish once', () => {
  for (const key of [' ', 'Space', 'Enter', 'ArrowUp', 'w']) {
    const game = createGame({ seed: 19 });
    advanceToRelease(game);
    game.input('key-down', { key, repeat: false });
    assert.equal(game.getState().progress, 1, key);
  }

  const results = [];
  const game = createGame({ seed: 42, onFinish: (result) => results.push(result) });
  for (let index = 0; index < VINE_SWING.total; index++)
    transfer(game, index % 2 ? 'primary-down' : 'key-down');
  assert.equal(results.length, 1);
  assert.deepEqual(results[0], {
    score: 1200,
    elapsed: results[0].elapsed,
    won: true,
    progress: 10,
    lives: 3,
  });
  assert.ok(results[0].elapsed > 8 && results[0].elapsed < 20);
  assert.deepEqual(rules.validate(results[0]), []);
  const end = game.getState();
  game.input('key-down', { key: ' ', repeat: false });
  game.update(999);
  assert.deepEqual(game.getState(), end);
  assert.equal(results.length, 1);
});

test('pointer bounds, repeated keys and unsupported input are ignored', () => {
  const game = createGame({ seed: 7 });
  advanceToRelease(game);
  game.input('key-down', { key: ' ', repeat: true });
  game.input('key-down', { key: 'x', repeat: false });
  for (const point of [
    {},
    { x: NaN, y: 10 },
    { x: -1, y: 10 },
    { x: 601, y: 10 },
    { x: 10, y: 481 },
  ])
    game.input('primary-down', point);
  assert.equal(game.getState().progress, 0);
  assert.equal(validPoint({ x: 0, y: 0 }), true);
  assert.equal(validPoint({ x: 600, y: 480 }), true);
  game.input('primary-down', { x: 300, y: 240 });
  assert.equal(game.getState().progress, 1);
  game.input('primary-down', { x: 300, y: 240 });
  assert.equal(game.getState().progress, 1, '飞行阶段不应重复释放');
});

test('early releases cost petals, recover, and three misses finish', () => {
  const results = [];
  const game = createGame({ seed: 4, onFinish: (result) => results.push(result) });
  for (let miss = 0; miss < 3; miss++) {
    const state = game.getState();
    if (phaseDistance(state.phase, state.releasePhase) <= releaseWindow(0))
      game.update(VINE_SWING.cycle * 0.25);
    game.input('key-down', { key: 'Enter', repeat: false });
    if (miss < 2) {
      assert.equal(game.getState().mode, 'recover');
      game.input('primary-down', { x: 300, y: 240 });
      game.update(VINE_SWING.resetTime);
    }
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

test('invalid time is ignored, timeout is bounded and destroy stays silent', () => {
  const timed = [];
  const game = createGame({ seed: 9, onFinish: (result) => timed.push(result) });
  for (const dt of [NaN, Infinity, -1, 0]) game.update(dt);
  assert.equal(game.getState().elapsed, 0);
  game.update(999);
  assert.equal(timed.length, 1);
  assert.equal(timed[0].elapsed, VINE_SWING.limit);
  assert.equal(timed[0].won, false);
  assert.deepEqual(rules.validate(timed[0]), []);

  const destroyed = [];
  const quiet = createGame({ seed: 1, onFinish: (result) => destroyed.push(result) });
  quiet.destroy();
  quiet.update(999);
  quiet.input('key-down', { key: ' ' });
  assert.equal(destroyed.length, 0);
});

test('state snapshots are isolated and ranked rules reject forged results', () => {
  const game = createGame({ seed: 17 });
  const state = game.getState();
  state.progress = 99;
  assert.notEqual(game.getState().progress, 99);

  const good = { score: 1200, elapsed: 15, won: true, progress: 10, lives: 2 };
  assert.deepEqual(rules.validate(good), []);
  for (const bad of [
    { ...good, score: 1080 },
    { ...good, score: 1190 },
    { ...good, progress: 9 },
    { ...good, lives: 0 },
    { ...good, won: false },
    { ...good, elapsed: 2 },
    { ...good, elapsed: 76 },
    { score: 360, elapsed: 2, won: false, progress: 3, lives: 2 },
  ])
    assert.ok(rules.validate(bad).length, JSON.stringify(bad));
  assert.deepEqual(rules.clean({ ...good, secret: 'vine' }), good);
});
