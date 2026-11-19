import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampGap,
  createGame,
  generateCourse,
  isAligned,
  TWIN_FIREFLIES,
  validPoint,
} from '../src/index.js';
import { rules } from '../src/rules.js';

function moveTo(game, target, type = 'key-down') {
  while (game.getState().gap !== target) {
    const narrow = target < game.getState().gap;
    if (type === 'primary-down') game.input(type, { x: narrow ? 120 : 480, y: 240 });
    else game.input(type, { key: narrow ? 'ArrowLeft' : 'ArrowRight', repeat: false });
  }
}

function complete(game, course, type = 'key-down') {
  let elapsed = 0;
  for (const gate of course.gates) {
    moveTo(game, gate.gap, type);
    game.update(gate.at - elapsed);
    elapsed = gate.at;
  }
}

test('seeded dual-gate courses are deterministic, varied and use every gap', () => {
  const signatures = new Set();
  for (let seed = 0; seed < 240; seed++) {
    const course = generateCourse(seed);
    assert.deepEqual(course, generateCourse(seed));
    assert.equal(course.gates.length, TWIN_FIREFLIES.total);
    assert.equal(new Set(course.gates.map(({ gap }) => gap)).size, 5);
    assert.ok(course.gates.every(({ gap }) => gap >= 86 && gap <= 214));
    assert.ok(
      course.gates.every((gate, index) => index === 0 || gate.gap !== course.gates[index - 1].gap),
    );
    assert.equal(course.gates.at(-1).at, 38.2);
    signatures.add(course.gates.map(({ level }) => level).join(''));
  }
  assert.ok(signatures.size > 225);
  assert.notDeepEqual(generateCourse(42), generateCourse(43));
});

test('gap helpers clamp movement and alignment windows', () => {
  assert.equal(clampGap(0), 86);
  assert.equal(clampGap(150), 150);
  assert.equal(clampGap(999), 214);
  assert.equal(isAligned(150, 150), true);
  assert.equal(isAligned(137, 150), true);
  assert.equal(isAligned(136, 150), false);
});

test('keyboard and pointer movement complete all twelve gates once', () => {
  for (const [key, expected] of [
    ['ArrowLeft', 118],
    ['a', 118],
    ['ArrowRight', 182],
    ['d', 182],
  ]) {
    const game = createGame({ seed: 5 });
    game.input('key-down', { key, repeat: false });
    assert.equal(game.getState().gap, expected, key);
  }

  const results = [];
  const game = createGame({ seed: 42, onFinish: (result) => results.push(result) });
  const course = generateCourse(42);
  complete(game, course, 'primary-down');
  assert.equal(results.length, 1);
  assert.deepEqual(results[0], {
    score: 1200,
    elapsed: 38.2,
    won: true,
    progress: 12,
    gates: 12,
    lives: 3,
  });
  assert.deepEqual(rules.validate(results[0]), []);
  const end = game.getState();
  game.input('key-down', { key: 'ArrowLeft' });
  game.update(999);
  assert.deepEqual(game.getState(), end);
  assert.equal(results.length, 1);
});

test('missed gates cost leaves and three misses end the run', () => {
  const results = [];
  const game = createGame({ seed: 11, onFinish: (result) => results.push(result) });
  const course = generateCourse(11);
  let elapsed = 0;
  for (const gate of course.gates) {
    const bad = gate.gap === 86 ? 214 : 86;
    moveTo(game, bad);
    game.update(gate.at - elapsed);
    elapsed = gate.at;
    if (game.getState().finished) break;
  }
  assert.equal(results.length, 1);
  assert.equal(results[0].lives, 0);
  assert.equal(results[0].gates, 3);
  assert.equal(results[0].progress, 0);
  assert.deepEqual(rules.validate(results[0]), []);
});

test('pointer bounds, repeats and unsupported inputs are ignored', () => {
  const game = createGame({ seed: 7 });
  game.input('key-down', { key: 'ArrowLeft', repeat: true });
  game.input('key-down', { key: 'x', repeat: false });
  for (const point of [
    {},
    { x: NaN, y: 10 },
    { x: -1, y: 10 },
    { x: 601, y: 10 },
    { x: 10, y: 481 },
  ])
    game.input('primary-down', point);
  assert.equal(game.getState().gap, TWIN_FIREFLIES.startGap);
  assert.equal(validPoint({ x: 0, y: 0 }), true);
  assert.equal(validPoint({ x: 600, y: 480 }), true);
  game.input('primary-down', { x: 120, y: 240 });
  assert.equal(game.getState().gap, 118);
  game.input('primary-down', { x: 480, y: 240 });
  assert.equal(game.getState().gap, 150);
});

test('movement stops at bounds and state snapshots are isolated', () => {
  const game = createGame({ seed: 3 });
  for (let index = 0; index < 20; index++) game.input('key-down', { key: 'a', repeat: false });
  assert.equal(game.getState().gap, TWIN_FIREFLIES.minGap);
  for (let index = 0; index < 20; index++) game.input('key-down', { key: 'd', repeat: false });
  assert.equal(game.getState().gap, TWIN_FIREFLIES.maxGap);
  const state = game.getState();
  state.progress = 99;
  assert.notEqual(game.getState().progress, 99);
});

test('invalid time is ignored, timeout is bounded and destroy stays silent', () => {
  const timed = [];
  const game = createGame({ seed: 9, onFinish: (result) => timed.push(result) });
  for (const dt of [NaN, Infinity, -1, 0]) game.update(dt);
  assert.equal(game.getState().elapsed, 0);
  game.update(999);
  assert.equal(timed.length, 1);
  assert.ok(timed[0].elapsed <= TWIN_FIREFLIES.limit);
  assert.equal(timed[0].won, false);
  assert.deepEqual(rules.validate(timed[0]), []);

  const destroyed = [];
  const quiet = createGame({ seed: 1, onFinish: (result) => destroyed.push(result) });
  quiet.destroy();
  quiet.update(999);
  quiet.input('key-down', { key: 'ArrowLeft' });
  assert.equal(destroyed.length, 0);
});

test('ranked rules accept genuine results and reject forged counters', () => {
  const good = { score: 1200, elapsed: 38.2, won: true, progress: 12, gates: 12, lives: 3 };
  assert.deepEqual(rules.validate(good), []);
  for (const bad of [
    { ...good, score: 1100 },
    { ...good, progress: 11 },
    { ...good, gates: 11 },
    { ...good, lives: 2 },
    { ...good, won: false },
    { ...good, elapsed: 51 },
    { score: 100, elapsed: 3, won: false, progress: 1, gates: 3, lives: 2 },
  ])
    assert.ok(rules.validate(bad).length, JSON.stringify(bad));
  assert.deepEqual(rules.clean({ ...good, secret: 'glow' }), good);
});
