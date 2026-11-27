import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACORN_GLIDE,
  createGame,
  generateCourse,
  pullPoint,
  START,
  targetPoint,
} from '../src/index.js';
import { rules } from '../src/rules.js';

function drag(game, end, cancel = false) {
  game.input('primary-down', START);
  game.input('primary-move', end);
  if (cancel) game.input('primary-cancel');
  else game.input('primary-up', end);
}

function settle(game) {
  game.update(5);
}

test('seeded courses are deterministic, varied, bounded and uniquely aimed', () => {
  const signatures = new Set();
  for (let seed = 0; seed < 300; seed++) {
    const course = generateCourse(seed);
    assert.deepEqual(course, generateCourse(seed));
    assert.equal(course.length, ACORN_GLIDE.shots);
    assert.equal(new Set(course.map(({ angle }) => angle)).size, ACORN_GLIDE.shots);
    for (const item of course) {
      assert.ok(item.angle >= -15 && item.angle <= 15 && item.angle % 5 === 0);
      assert.ok(item.power >= 0.6 && item.power <= 0.9);
      const target = targetPoint(item);
      assert.ok(target.x >= 190 && target.x <= 410 && target.y >= 90 && target.y <= 160);
    }
    signatures.add(JSON.stringify(course));
  }
  assert.ok(signatures.size > 150);
});

test('real pointer pulls land six acorns in the flower centers and finish once', () => {
  const results = [];
  const game = createGame({ seed: 42, onFinish: (result) => results.push(result) });
  for (const item of generateCourse(42)) {
    drag(game, pullPoint(item));
    settle(game);
  }
  assert.equal(results.length, 1);
  assert.deepEqual(results[0], {
    score: 1200,
    elapsed: results[0].elapsed,
    won: true,
    shots: 6,
    rings: 6,
    bullseyes: 6,
  });
  assert.ok(results[0].elapsed > 0 && results[0].elapsed < ACORN_GLIDE.limit);
  assert.deepEqual(rules.validate(results[0]), []);
  game.update(99);
  assert.equal(results.length, 1);
});

test('keyboard angle and power adjustments reproduce every seeded perfect shot', () => {
  const game = createGame({ seed: 19 });
  for (const item of generateCourse(19)) {
    const horizontal = item.angle / ACORN_GLIDE.angleStep;
    for (let step = 0; step < Math.abs(horizontal); step++)
      game.input('key-down', { key: horizontal < 0 ? 'ArrowLeft' : 'ArrowRight' });
    const strength = Math.round((item.power - 0.75) / ACORN_GLIDE.powerStep);
    for (let step = 0; step < Math.abs(strength); step++)
      game.input('key-down', { key: strength < 0 ? 'ArrowDown' : 'ArrowUp' });
    game.input('key-down', { key: 'Space' });
    settle(game);
  }
  assert.equal(game.getState().score, 1200);
  assert.equal(game.getState().won, true);
});

test('short pulls, cancellation, drag-out starts and repeats never launch', () => {
  const game = createGame({ seed: 3 });
  drag(game, { x: START.x, y: START.y + 20 });
  drag(game, pullPoint(generateCourse(3)[0]), true);
  game.input('primary-down', { x: 10, y: 10 });
  game.input('primary-up', pullPoint(generateCourse(3)[0]));
  game.input('key-down', { key: 'Space', repeat: true });
  assert.equal(game.getState().shots, 0);
  assert.equal(game.getState().phase, 'aim');
});

test('flight and rest phases lock input while exact integration reaches the target', () => {
  const game = createGame({ seed: 8 });
  const first = generateCourse(8)[0];
  drag(game, pullPoint(first));
  assert.equal(game.getState().phase, 'flight');
  const locked = game.getState();
  game.input('key-down', { key: 'ArrowLeft' });
  drag(game, { x: 300, y: 465 });
  assert.equal(game.getState().angle, locked.angle);
  game.update(4);
  const state = game.getState();
  assert.equal(state.bullseyes, 1);
  assert.equal(state.round, 1);
});

test('misses score honestly and the sixth shot always reaches an end state', () => {
  const results = [];
  const game = createGame({ seed: 13, onFinish: (result) => results.push(result) });
  for (let shot = 0; shot < ACORN_GLIDE.shots; shot++) {
    game.input('key-down', { key: shot % 2 ? 'ArrowLeft' : 'ArrowRight' });
    game.input('key-down', { key: 'Space' });
    settle(game);
  }
  assert.equal(results.length, 1);
  assert.equal(results[0].shots, 6);
  assert.equal(results[0].won, false);
  assert.deepEqual(rules.validate(results[0]), []);
});

test('invalid time is ignored, timeout clamps, snapshots isolate and destroy stays silent', () => {
  const results = [];
  const game = createGame({ seed: 5, onFinish: (result) => results.push(result) });
  for (const dt of [NaN, Infinity, -1, 0]) game.update(dt);
  assert.equal(game.getState().elapsed, 0);
  const snapshot = game.getState();
  snapshot.course[0].angle = 99;
  snapshot.position.x = 99;
  assert.notEqual(game.getState().course[0].angle, 99);
  assert.notEqual(game.getState().position.x, 99);
  game.update(999);
  assert.equal(results[0].elapsed, ACORN_GLIDE.limit);
  assert.deepEqual(rules.validate(results[0]), []);
  const quiet = [];
  const destroyed = createGame({ seed: 5, onFinish: (result) => quiet.push(result) });
  destroyed.destroy();
  destroyed.update(999);
  assert.equal(quiet.length, 0);
});

test('ranked rules reject forged scores, counters and early unfinished losses', () => {
  const good = { score: 1200, elapsed: 22, won: true, shots: 6, rings: 6, bullseyes: 6 };
  assert.deepEqual(rules.validate(good), []);
  for (const bad of [
    { ...good, score: 1100 },
    { ...good, shots: 5 },
    { ...good, rings: 5 },
    { ...good, bullseyes: 7 },
    { ...good, won: false },
    { score: 100, elapsed: 12, won: false, shots: 2, rings: 1, bullseyes: 0 },
  ])
    assert.ok(rules.validate(bad).length, JSON.stringify(bad));
});
